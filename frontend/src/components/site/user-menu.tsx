"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Icon } from "../icons";
import { useAuth } from "../providers";
import { Avatar, LangSwitch } from "../ui";

/** Pill button (hamburger + avatar) with a dropdown — shared by the market header and the dashboards. */
export function UserMenu({ tone = "light", align = "right", avatarOnlyOnPhones = false }: { tone?: "light" | "dark"; align?: "right" | "left"; avatarOnlyOnPhones?: boolean }) {
  const t = useTranslations("Nav");
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dark = tone === "dark";
  const item = `flex min-h-11 items-center gap-3 px-4 text-[15px] ${dark ? "text-ivory hover:bg-obsidian" : "text-hof hover:bg-faint"}`;
  const links = user
    ? [
        { href: "/trips", label: t("trips"), icon: "calendar" },
        { href: "/messages", label: t("messages"), icon: "message" },
        { href: "/wishlist", label: t("wishlist"), icon: "heart" },
        { href: "/profile", label: t("profile"), icon: "user" },
        { href: "/host", label: t("hostDashboard"), icon: "chart", divider: true },
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: t("admin"), icon: "shield" }] : []),
      ]
    : [
        { href: "/login", label: t("login"), icon: "user" },
        { href: "/register", label: t("register"), icon: "plus" },
        { href: "/host/listings/new", label: t("becomeHost"), icon: "tag", divider: true },
      ];

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="menu"
        aria-label={t("menu")}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 min-w-11 items-center justify-center gap-2.5 rounded-full py-1 pr-1.5 transition-shadow ${avatarOnlyOnPhones ? "max-lg:pl-1.5 lg:pl-3.5" : "pl-3.5"} ${
          dark ? "border border-slate-line text-ivory hover:bg-obsidian" : "border border-[#dddddd] bg-white text-hof hover:shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
        }`}
      >
        <Icon name="menu" size={18} className={avatarOnlyOnPhones ? "max-lg:hidden" : ""} />
        {user ? <Avatar name={user.name} src={user.avatarUrl} size={32} /> : <span className={`flex size-8 items-center justify-center rounded-full ${dark ? "bg-obsidian" : "bg-[#717171] text-white"}`}><Icon name="user" size={18} /></span>}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={`absolute top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl py-2 shadow-[0_6px_20px_rgba(0,0,0,0.2)] ${align === "right" ? "right-0" : "left-0"} ${
            dark ? "border border-slate-line bg-graphite" : "bg-white"
          }`}
        >
          {user && (
            <div className={`px-4 pb-2 pt-1 text-[13px] ${dark ? "text-ash" : "text-foggy"}`}>
              <div className={`truncate text-[15px] font-medium ${dark ? "text-ivory" : "text-hof"}`} translate="no">{user.name}</div>
              <div className="truncate" translate="no">{user.email}</div>
            </div>
          )}
          {links.map((l) => (
            <div key={l.href}>
              {l.divider && <div className={`my-1.5 h-px ${dark ? "bg-slate-line" : "bg-hair"}`} />}
              <Link role="menuitem" href={l.href} className={item} onClick={() => setOpen(false)}>
                <Icon name={l.icon} size={18} />
                {l.label}
              </Link>
            </div>
          ))}
          <div className={`my-1.5 h-px sm:hidden ${dark ? "bg-slate-line" : "bg-hair"}`} />
          <LangSwitch className={`w-full !rounded-none !px-4 sm:hidden ${dark ? "text-ivory hover:bg-obsidian" : "text-hof hover:bg-faint"}`} />
          {user && (
            <>
              <div className={`my-1.5 h-px ${dark ? "bg-slate-line" : "bg-hair"}`} />
              <button
                role="menuitem"
                type="button"
                className={`${item} w-full`}
                onClick={() => {
                  logout();
                  setOpen(false);
                  router.push("/");
                }}
              >
                <Icon name="logout" size={18} />
                {t("logout")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
