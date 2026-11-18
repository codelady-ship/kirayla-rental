import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { catName, money } from "@/lib/format";
import type { Category, ListingCard } from "@/lib/types";
import { Icon } from "../icons";
import { Photo } from "../ui";

function SectionHead({ id, title, href, more }: { id: string; title: string; href: string; more: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 id={id} className="text-[20px] font-semibold tracking-tight-20">
        <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 hover:opacity-70">
          {title}
          <Icon name="chevronRight" size={16} strokeWidth={2} />
        </Link>
      </h2>
      <Link href={href} className="inline-flex min-h-11 items-center text-[14px] text-stone hover:text-ink">
        {more}
      </Link>
    </div>
  );
}

function Tile({ l, locale, sizes }: { l: ListingCard; locale: string; sizes: string }) {
  return (
    <Link href={`/listing/${l.id}`} className="group relative block aspect-square overflow-hidden rounded-pillow bg-[#665a54]">
      <Photo src={l.coverUrl} alt="" fill sizes={sizes} className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
      <span className="absolute inset-x-3 bottom-3 flex max-w-[calc(100%-24px)] flex-col rounded-[12px] bg-white/85 px-3 py-2 backdrop-blur-sm">
        <span className="truncate text-[14px] font-semibold tracking-[-0.014em]">{l.title}</span>
        <span className="num text-[12px] text-[#4b4846]">
          {money(l.dailyPrice, locale)} / {locale === "en" ? "day" : "gün"} · {l.city}
        </span>
      </span>
    </Link>
  );
}

/** "Category band": a 28px-radius hero image (≈60%) with the category name in white display type + a 2×2 tile grid. */
export function CategoryBand({ category, items, locale, flip }: { category: Category; items: ListingCard[]; locale: string; flip: boolean }) {
  const t = useTranslations("Home");
  const [hero, ...rest] = items;
  if (!hero) return null;
  const id = `band-${category.slug}`;
  return (
    <section aria-labelledby={id}>
      <SectionHead id={id} title={catName(category, locale)} href={`/c/${category.slug}`} more={t("seeAll")} />
      <div className={`grid gap-3 md:grid-cols-[1.5fr_1fr] ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
        <Link href={`/c/${category.slug}`} className="group relative block min-h-[280px] overflow-hidden rounded-pillow bg-[#665a54] md:min-h-0">
          <Photo src={hero.coverUrl} alt="" fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/0 to-black/0" />
          <span className="absolute left-6 top-5 max-w-[80%] text-white">
            <span className="block text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[44px]">{catName(category, locale)}</span>
            <span className="mt-2 block text-[14px] opacity-90">
              {t("cityCount", { count: category.listingCount })}
            </span>
          </span>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          {rest.slice(0, 4).map((l) => (
            <Tile key={l.id} l={l} locale={locale} sizes="(min-width: 768px) 20vw, 50vw" />
          ))}
        </div>
      </div>
    </section>
  );
}

/** A plain 4-column row (2 on phones) — used for "fresh listings". */
export function TileRow({ id, title, href, items, locale }: { id: string; title: string; href: string; items: ListingCard[]; locale: string }) {
  const t = useTranslations("Home");
  return (
    <section aria-labelledby={id}>
      <SectionHead id={id} title={title} href={href} more={t("seeAll")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.slice(0, 8).map((l) => (
          <Tile key={l.id} l={l} locale={locale} sizes="(min-width: 768px) 25vw, 50vw" />
        ))}
      </div>
    </section>
  );
}
