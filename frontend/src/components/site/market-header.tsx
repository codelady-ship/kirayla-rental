"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Icon } from "../icons";
import { DemoBanner, LangSwitch, Wordmark } from "../ui";
import { UserMenu } from "./user-menu";

/** White 80px gallery header: wordmark (coral dot) · compact search capsule · host link, language, account. */
export function MarketHeader({ initialQuery = "" }: { initialQuery?: string }) {
  const t = useTranslations("Nav");
  const th = useTranslations("Home");
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-hair bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <DemoBanner />
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-3 px-4 sm:h-20 sm:gap-6 sm:px-6 lg:px-10">
        <Link href="/" className="flex min-h-11 shrink-0 items-center text-hof" aria-label="Share">
          <Wordmark zone="market" size={24} />
        </Link>

        <form role="search" onSubmit={submit} className="mx-auto flex min-w-0 max-w-[480px] flex-1 items-center rounded-full bg-white shadow-[var(--shadow-capsule)]">
          <label htmlFor="market-q" className="sr-only">
            {th("searchLabel")}
          </label>
          <input
            id="market-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={th("searchPlaceholder")}
            className="h-12 min-w-0 flex-1 rounded-full bg-transparent pl-5 text-[14px] font-medium text-hof placeholder:font-normal placeholder:text-foggy focus:outline-none"
          />
          <button type="submit" aria-label={th("searchSubmit")} className="m-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-coral-deep text-white">
            <Icon name="search" size={16} strokeWidth={2.4} />
          </button>
        </form>

        <nav className="flex shrink-0 items-center gap-1" aria-label={t("menu")}>
          <Link href="/host/listings/new" className="hidden min-h-11 items-center rounded-full px-4 text-[14px] font-medium text-hof hover:bg-faint lg:inline-flex">
            {t("becomeHost")}
          </Link>
          <LangSwitch className="text-hof hover:bg-faint max-sm:hidden" />
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
