"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { money } from "@/lib/format";
import type { ListingCard as Card } from "@/lib/types";
import { Icon } from "../icons";
import { Photo } from "../ui";
import { HeartButton } from "./heart";

/** Flat, borderless gallery card: 1:1 photo with 12px radius, heart top-right, text directly beneath. */
export function ListingCard({ l, priority = false, badge }: { l: Card; priority?: boolean; badge?: string }) {
  const locale = useLocale();
  const t = useTranslations("Common");
  const favourite = l.reviewCount >= 3 && l.ratingAvg >= 4.7;
  return (
    <article className="group relative">
      <div className="relative aspect-square overflow-hidden rounded-card bg-deco">
        <Photo src={l.coverUrl} alt="" fill priority={priority} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, (min-width: 520px) 45vw, 92vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        {(badge || favourite) && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-hof shadow-[0_2px_4px_rgba(0,0,0,0.18)]">
            {badge ?? (locale === "en" ? "Renter favourite" : "Kirayəçilərin seçimi")}
          </span>
        )}
        <HeartButton listingId={l.id} />
      </div>
      <div className="mt-3 text-[14px] leading-[1.35]">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-medium">
            <Link href={`/listing/${l.id}`} className="after:absolute after:inset-0 after:content-['']">
              {l.title}
            </Link>
          </h3>
          {l.reviewCount > 0 ? (
            <span className="num flex shrink-0 items-center gap-1">
              <Icon name="star" size={12} fill="currentColor" strokeWidth={0} />
              {l.ratingAvg.toFixed(2).replace(/0$/, "")}
              <span className="sr-only">/ 5</span>
            </span>
          ) : (
            <span className="shrink-0">{t("new")}</span>
          )}
        </div>
        <p className="truncate text-foggy">
          {l.city}
          {l.district ? `, ${l.district}` : ""} · {l.hostName}
        </p>
        <p className="mt-1">
          <span className="num font-semibold">{money(l.dailyPrice, locale)}</span> <span className="text-foggy">/ {t("perDay")}</span>
        </p>
      </div>
    </article>
  );
}

export function CardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-square animate-pulse rounded-card bg-[#ececec]" />
      <div className="mt-3 h-3.5 w-3/4 animate-pulse rounded bg-[#ececec]" />
      <div className="mt-2 h-3.5 w-1/2 animate-pulse rounded bg-[#ececec]" />
    </div>
  );
}
