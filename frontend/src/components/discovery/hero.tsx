"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { catName, money } from "@/lib/format";
import type { Category, ListingCard } from "@/lib/types";
import { CATEGORY_TINT, Icon } from "../icons";
import { Photo, Wordmark } from "../ui";

// Hand-placed constellation. l = left % at ≥1280 (7 cards), lm = left % at 640–1279 (5 cards, the two "wide only"
// ones are hidden), t = top px, w = width px (scaled by --k below 1280), r = tilt, d = float delay.
// Neighbours overlap by ~12px — the card's own padding — so no title is ever covered.
const SPOTS: { l: number; lm: number; t: number; w: number; r: number; d: number; z: number; wideOnly?: boolean }[] = [
  { l: 0, lm: 0, t: 44, w: 160, r: -4, d: 0, z: 2 },
  { l: 14.2, lm: 0, t: 4, w: 150, r: 3, d: 1.4, z: 1, wideOnly: true },
  { l: 27.5, lm: 20.5, t: 56, w: 172, r: -2, d: 0.6, z: 3 },
  { l: 42.9, lm: 41, t: 10, w: 156, r: 2.5, d: 2.1, z: 2 },
  { l: 56.7, lm: 60.5, t: 50, w: 168, r: -3, d: 0.9, z: 3 },
  { l: 71.2, lm: 0, t: 0, w: 150, r: 3.5, d: 1.8, z: 1, wideOnly: true },
  { l: 84.6, lm: 81, t: 34, w: 160, r: -1.5, d: 0.3, z: 2 },
];

function FloatCard({ l, spot, locale }: { l: ListingCard; spot: (typeof SPOTS)[number]; locale: string }) {
  const style = {
    "--l": `${spot.l}%`,
    "--lm": `${spot.lm}%`,
    top: spot.t,
    width: `calc(${spot.w}px * var(--k))`,
    zIndex: spot.z,
    "--r": `${spot.r}deg`,
    animationDelay: `${spot.d}s`,
  } as CSSProperties;
  return (
    <Link
      href={`/listing/${l.id}`}
      style={style}
      className={`group absolute left-[min(var(--lm),calc(100%_-_var(--k)_*_170px))] animate-float rounded-pillow bg-white p-2 shadow-[var(--shadow-float)] transition-shadow hover:shadow-[var(--shadow-lift)] xl:left-[var(--l)] ${spot.wideOnly ? "max-xl:hidden" : ""}`}
    >
      <span className="relative block aspect-square overflow-hidden rounded-pillow-inner bg-[#ece9e7]">
        <Photo src={l.coverUrl} alt="" fill sizes="190px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      </span>
      <span className="block px-1.5 pb-1 pt-2">
        <span className="block truncate text-[14px] font-semibold tracking-[-0.014em]">{l.title}</span>
        <span className="mt-0.5 flex items-center justify-between text-[12px] text-stone">
          <span className="num">
            {money(l.dailyPrice, locale)}
            <span className="text-[11px]"> / {locale === "en" ? "day" : "gün"}</span>
          </span>
          {l.reviewCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-ink" aria-label={`${l.ratingAvg} / 5`}>
              <Icon name="star" size={9} fill="currentColor" strokeWidth={0} />
              <span className="num">{l.ratingAvg.toFixed(1)}</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

export function DiscoveryHero({ featured, categories }: { featured: ListingCard[]; categories: Category[] }) {
  const t = useTranslations("Home");
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
  };

  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-6 pt-2 sm:px-6 lg:pt-10" aria-labelledby="hero-title">
      {/* constellation */}
      <div aria-label={t("constellationLabel")} role="group" className="relative mx-auto hidden h-[250px] max-w-[1040px] [--k:0.7] sm:block md:h-[270px] md:[--k:0.82] xl:h-[300px] xl:[--k:1]">
        {featured.slice(0, SPOTS.length).map((l, i) => (
          <FloatCard key={l.id} l={l} spot={SPOTS[i]} locale={locale} />
        ))}
      </div>
      {/* phones: a short swipeable strip instead of the overlapping cloud */}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 pt-2 scrollbar-none sm:hidden" aria-label={t("constellationLabel")} role="group">
        {featured.slice(0, 6).map((l, i) => (
          <Link
            key={l.id}
            href={`/listing/${l.id}`}
            className="w-[42%] shrink-0 snap-start rounded-pillow bg-white p-2 shadow-[var(--shadow-float)]"
            style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}
          >
            <span className="relative block aspect-square overflow-hidden rounded-pillow-inner bg-[#ece9e7]">
              <Photo src={l.coverUrl} alt="" fill sizes="45vw" className="object-cover" />
            </span>
            <span className="block truncate px-1 pt-2 text-[13px] font-semibold">{l.title}</span>
            <span className="num block px-1 pb-1 text-[12px] text-stone">{money(l.dailyPrice, locale)}</span>
          </Link>
        ))}
      </div>

      <div className="relative z-10 mt-4 text-center sm:mt-2">
        <h1 id="hero-title" className="flex justify-center">
          <Wordmark className="text-[52px] leading-none sm:text-[72px]" />
          <span className="sr-only"> — {t("tagline")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[30rem] text-[16px] leading-[1.38] tracking-tight-16 text-stone" aria-hidden="true">
          {t("tagline")}
        </p>

        <form role="search" onSubmit={submit} className="mx-auto mt-8 flex max-w-[560px] items-center rounded-full border border-black/10 bg-white py-1 pl-5 pr-1 shadow-[var(--shadow-soft)]">
          <label htmlFor="home-q" className="sr-only">
            {t("searchLabel")}
          </label>
          <Icon name="search" size={18} className="shrink-0 text-stone" />
          <input
            id="home-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[16px] tracking-tight-16 placeholder:text-stone focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t("searchSubmit")}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet text-white shadow-[var(--shadow-violet)] transition-transform hover:scale-[1.04] active:scale-95"
          >
            <Icon name="arrowRight" size={20} strokeWidth={2} />
          </button>
        </form>

        <nav aria-label={t("categoriesLabel")} className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 scrollbar-none">
          <ul className="mx-auto flex w-max gap-2 md:w-auto md:max-w-[1000px] md:flex-wrap md:justify-center">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-hair bg-white py-1.5 pl-1.5 pr-4 text-[15px] tracking-[-0.014em] shadow-[var(--shadow-soft)] transition-colors hover:border-[#d6d6d6]"
                >
                  <span className="flex size-8 items-center justify-center rounded-full" style={{ background: CATEGORY_TINT[c.icon] ?? "#f2f4f5" }}>
                    <Icon name={c.icon} size={16} />
                  </span>
                  {catName(c, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
