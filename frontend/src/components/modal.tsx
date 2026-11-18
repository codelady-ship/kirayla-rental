"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

/** Accessible dialog: focus moves in, Escape / backdrop closes, focus returns to the opener. */
export function Modal({ open, onClose, title, children, tone = "light" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; tone?: "light" | "dark" }) {
  const t = useTranslations("Common");
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("input, textarea, select, button:not([data-close])");
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input, textarea, select")];
        if (!f.length) return;
        const [a, z] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const dark = tone === "dark";
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={id}>
      <button type="button" data-close tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={`relative max-h-[92dvh] w-full animate-zone-in overflow-y-auto rounded-t-[20px] p-6 shadow-[var(--shadow-overlay)] sm:max-w-lg sm:rounded-[20px] ${
          dark ? "border border-slate-line bg-graphite text-ivory" : "bg-white text-hof"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={id} className="text-[18px] font-semibold">
            {title}
          </h2>
          <button type="button" data-close onClick={onClose} aria-label={t("close")} className={`-m-2 flex size-11 shrink-0 items-center justify-center rounded-full ${dark ? "hover:bg-obsidian" : "hover:bg-faint"}`}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
