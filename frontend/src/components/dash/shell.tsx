"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useRequireAuth } from "@/lib/use-require-auth";
import { Icon } from "../icons";
import { UserMenu } from "../site/user-menu";
import { LangSwitch, Spinner, Wordmark } from "../ui";

type Item = { href: string; label: string; icon: string; exact?: boolean };

function NavList({ items, onNavigate }: { items: Item[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[40px] px-4 text-[15px] transition-colors ${
                active ? "bg-obsidian text-ivory" : "text-ash hover:bg-obsidian/60 hover:text-ivory"
              }`}
            >
              <Icon name={it.icon} size={18} strokeWidth={1.5} />
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Dark Mercury-style shell for the host dashboard and the admin panel. Sidebar ≥1024px, drawer below. */
export function DashShell({ kind, children }: { kind: "host" | "admin"; children: ReactNode }) {
  const t = useTranslations("Dash");
  const { allowed, user, ready } = useRequireAuth(kind === "admin" ? "ADMIN" : undefined);
  const [drawer, setDrawer] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const items: Item[] =
    kind === "host"
      ? [
          { href: "/host", label: t("overview"), icon: "chart", exact: true },
          { href: "/host/listings", label: t("listings"), icon: "grid" },
          { href: "/host/bookings", label: t("bookings"), icon: "inbox" },
        ]
      : [
          { href: "/admin", label: t("overview"), icon: "chart", exact: true },
          { href: "/admin/users", label: t("users"), icon: "users" },
          { href: "/admin/listings", label: t("allListings"), icon: "grid" },
          { href: "/admin/bookings", label: t("allBookings"), icon: "calendar" },
          { href: "/admin/categories", label: t("categories"), icon: "tag" },
          { href: "/admin/reports", label: t("reports"), icon: "flag" },
        ];

  const brand = (
    <Link href={kind === "host" ? "/host" : "/admin"} className="flex min-h-11 items-center gap-3 text-ivory">
      <Wordmark zone="dashboard" size={22} />
      <span className="rounded-[40px] border border-slate-line px-2.5 py-0.5 text-[12px] tracking-[0.01em] text-ash">{kind === "host" ? t("host") : t("admin")}</span>
    </Link>
  );
  const footer = (
    <div className="space-y-1 border-t border-slate-line pt-4">
      {kind === "host" && user?.role === "ADMIN" && (
        <Link href="/admin" className="flex min-h-11 items-center gap-3 rounded-[40px] px-4 text-[15px] text-ash hover:text-ivory">
          <Icon name="shield" size={18} /> {t("admin")}
        </Link>
      )}
      {kind === "admin" && (
        <Link href="/host" className="flex min-h-11 items-center gap-3 rounded-[40px] px-4 text-[15px] text-ash hover:text-ivory">
          <Icon name="chart" size={18} /> {t("host")}
        </Link>
      )}
      <Link href="/" className="flex min-h-11 items-center gap-3 rounded-[40px] px-4 text-[15px] text-ash hover:text-ivory">
        <Icon name="arrowRight" size={18} className="rotate-180" /> {t("backToSite")}
      </Link>
      <LangSwitch className="!px-4 text-ash hover:text-ivory" />
    </div>
  );

  return (
    <div data-zone="dashboard" className="min-h-dvh bg-onyx text-ivory">
      <div className="lg:grid lg:grid-cols-[256px_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-slate-line/60 bg-onyx px-4 py-6 lg:flex" aria-label={kind === "host" ? t("host") : t("admin")}>
          <div className="px-2">{brand}</div>
          <nav className="flex-1">
            <NavList items={items} />
            {kind === "host" && (
              <Link href="/host/listings/new" className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-[32px] bg-cobalt px-5 text-[15px] text-white">
                <Icon name="plus" size={18} /> {t("newListing")}
              </Link>
            )}
          </nav>
          {footer}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-line/60 bg-onyx/85 px-4 backdrop-blur-[20px] sm:px-6 lg:justify-end lg:px-10">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-expanded={drawer}
              aria-controls={drawerId}
              aria-label={t("openMenu")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-line lg:hidden"
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="lg:hidden">{brand}</div>
            <UserMenu tone="dark" />
          </header>

          {user?.readOnly && (
            <p role="status" className="border-b border-slate-line/60 bg-graphite px-4 py-2.5 text-center text-[14px] text-ash sm:px-6">
              <Icon name="eye" size={16} className="mr-2 inline align-[-3px]" />
              {t("readOnlyBanner")}
            </p>
          )}

          <main id="main" className="mx-auto max-w-[1200px] animate-dash-in 2xl:max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
            {!ready || !user ? (
              <div className="flex justify-center py-24 text-ash">
                <Spinner />
              </div>
            ) : !allowed ? (
              <p role="alert" className="rounded-[12px] bg-graphite p-8 text-center text-ash">
                {t("forbidden")}
              </p>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {drawer && (
        <div id={drawerId} className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={kind === "host" ? t("host") : t("admin")}>
          <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,86vw)] animate-zone-in flex-col gap-8 overflow-y-auto border-r border-slate-line bg-onyx px-4 py-5">
            <div className="flex items-center justify-between px-2">
              {brand}
              <button type="button" onClick={() => setDrawer(false)} aria-label={t("closeMenu")} className="flex size-11 items-center justify-center rounded-full hover:bg-obsidian">
                <Icon name="x" />
              </button>
            </div>
            <nav className="flex-1">
              <NavList items={items} onNavigate={() => setDrawer(false)} />
              {kind === "host" && (
                <Link href="/host/listings/new" className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-[32px] bg-cobalt px-5 text-[15px] text-white">
                  <Icon name="plus" size={18} /> {t("newListing")}
                </Link>
              )}
            </nav>
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
