"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { Photo as P } from "@/lib/types";
import { Icon } from "../icons";
import { Photo } from "../ui";

/** Airbnb-style mosaic (1 large + up to 4 small, outer corners rounded) → swipe strip on phones → full-screen list. */
export function Gallery({ photos, title }: { photos: P[]; title: string }) {
  const t = useTranslations("Listing");
  const tc = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const alt = (i: number) => `${title} — ${t("photoOf", { n: i + 1, total: photos.length })}`;
  const small = photos.slice(1, 5);

  return (
    <section aria-label={t("gallery")} className="relative">
      {/* phones */}
      <div className="-mx-4 sm:hidden">
        <div
          ref={strip}
          className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
          tabIndex={0}
          role="group"
          aria-label={t("gallery")}
          onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {(photos.length ? photos : [null]).map((p, i) => (
            <div key={p?.id ?? i} className="relative aspect-[4/3] w-full shrink-0 snap-center bg-deco">
              <Photo src={p?.url} alt={alt(i)} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <span className="num absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[12px] text-white" aria-hidden="true">
            {idx + 1} / {photos.length}
          </span>
        )}
      </div>

      {/* tablet / desktop mosaic */}
      <div className={`hidden gap-2 overflow-hidden rounded-card sm:grid ${small.length ? "sm:h-[380px] sm:grid-cols-4 sm:grid-rows-2 lg:h-[460px]" : "sm:h-[440px]"}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`relative bg-deco ${small.length ? (small.length >= 2 ? "col-span-2 row-span-2" : "col-span-3 row-span-2") : ""}`}
          aria-label={t("showAll")}
        >
          <Photo src={photos[0]?.url} alt={alt(0)} fill priority sizes="(min-width: 1024px) 50vw, 60vw" className="object-cover transition-[filter] hover:brightness-90" />
        </button>
        {small.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(true)}
            className={`relative bg-deco ${small.length === 1 ? "row-span-2" : small.length === 2 ? "col-span-2" : small.length === 3 && i === 2 ? "col-span-2" : ""}`}
            aria-label={`${t("showAll")} (${i + 2})`}
          >
            <Photo src={p.url} alt={alt(i + 1)} fill sizes="25vw" className="object-cover transition-[filter] hover:brightness-90" />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute bottom-4 right-4 hidden min-h-11 items-center gap-2 rounded-lg border border-hof bg-white px-3 text-[14px] font-medium sm:inline-flex"
        >
          <Icon name="grid" size={16} />
          {t("showAll")}
        </button>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label={t("gallery")} className="fixed inset-0 z-[60] overflow-y-auto bg-white animate-zone-in">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-4 py-3 backdrop-blur sm:px-8">
            <button ref={closeBtn} type="button" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-full hover:bg-faint" aria-label={tc("close")}>
              <Icon name="chevronLeft" />
            </button>
            <span className="num text-[14px] text-foggy">{photos.length}</span>
          </div>
          <ul className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-8">
            {photos.map((p, i) => (
              <li key={p.id}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-deco">
                  <Photo src={p.url} alt={alt(i)} fill sizes="(min-width: 768px) 768px, 100vw" className="object-contain" />
                </div>
                {p.credit && (
                  <p className="mt-2 text-[12px] text-foggy" translate="no">
                    {tc("photoCredit")}:{" "}
                    {p.creditUrl ? (
                      <a href={p.creditUrl} className="underline underline-offset-2 hover:text-hof" rel="noopener nofollow" target="_blank">
                        {p.credit}
                      </a>
                    ) : (
                      p.credit
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
