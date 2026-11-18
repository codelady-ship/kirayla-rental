"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon } from "../icons";
import { useAuth } from "../providers";
import { Avatar, LangSwitch, Wordmark } from "../ui";
import { UserMenu } from "../site/user-menu";

/** 64px white navigation rail (desktop) / slim top bar (mobile) for the discovery zone. */
export function DiscoveryRail() {
  const t = useTranslations("Nav");
  const tl = useTranslations("Listing");
  const th = useTranslations("Home");
  const { user } = useAuth();
  const pathname = usePathname();
  const items = [
    { href: "/", icon: "home", label: tl("home") },
    { href: "/search", icon: "search", label: th("searchSubmit") },
    { href: "/wishlist", icon: "heart", label: t("wishlist") },
    { href: "/messages", icon: "message", label: t("messages") },
    { href: "/host", icon: "chart", label: t("hostDashboard") },
  ];

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col items-center border-r border-hair bg-white py-4 lg:flex" aria-label={t("menu")}>
        <Link href="/" aria-label="Kirayla" className="mb-6 flex size-12 items-center justify-center">
          <span aria-hidden="true" className="relative flex size-9 items-center justify-center rounded-[12px] bg-black text-[17px] font-semibold text-white" translate="no">
            k<span className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full bg-violet" />
          </span>
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-1">
          {items.map((it) => {
            const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-label={it.label}
                title={it.label}
                aria-current={active ? "page" : undefined}
                className={`flex size-12 items-center justify-center rounded-[20px] text-ink transition-colors ${active ? "bg-mist" : "hover:bg-mist/70"}`}
              >
                <Icon name={it.icon} size={24} strokeWidth={1.5} />
              </Link>
            );
          })}
        </nav>
        <LangSwitch className="mb-2 !px-2 text-[12px] text-stone hover:text-ink" />
        <Link href={user ? "/profile" : "/login"} aria-label={user ? t("profile") : t("login")} className="flex size-12 items-center justify-center">
          {user ? (
            <span className="rounded-full ring-2 ring-hair">
              <Avatar name={user.name} src={user.avatarUrl} size={32} />
            </span>
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-mist ring-2 ring-hair">
              <Icon name="user" size={18} />
            </span>
          )}
        </Link>
      </aside>

      <div className="flex h-16 items-center justify-between px-4 lg:hidden">
        <Link href="/" className="flex min-h-11 items-center" aria-label="Kirayla">
          <Wordmark size={22} />
        </Link>
        <div className="flex items-center gap-1">
          <LangSwitch className="hidden text-ink sm:inline-flex" />
          <UserMenu />
        </div>
      </div>
    </>
  );
}
