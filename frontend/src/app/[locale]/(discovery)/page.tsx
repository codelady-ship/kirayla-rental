import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryBand, TileRow } from "@/components/discovery/bands";
import { DiscoveryHero } from "@/components/discovery/hero";
import { DiscoveryRail } from "@/components/discovery/rail";
import { Icon } from "@/components/icons";
import { Footer } from "@/components/site/footer";
import { Link } from "@/i18n/navigation";
import { serverGet } from "@/lib/api";
import { demoCategories, demoSearch } from "@/lib/demo";
import { HERO_CARDS, heroCards } from "@/lib/hero";
import type { Category, ListingCard, Page } from "@/lib/types";

export const revalidate = 300;

async function loadHome() {
  const [cats, top, fresh, highlights] = await Promise.all([
    serverGet<Category[]>("/api/categories"),
    serverGet<Page<ListingCard>>("/api/listings?sort=rating&size=48"),
    serverGet<Page<ListingCard>>("/api/listings?sort=newest&size=8"),
    serverGet<ListingCard[]>(`/api/listings/highlights?size=${HERO_CARDS}`),
  ]);
  return {
    highlights: highlights.data?.length ? highlights.data : null,
    categories: cats.data ?? demoCategories,
    top: top.data?.content ?? demoSearch({ sort: "rating", size: 48 }).content,
    fresh: fresh.data?.content ?? demoSearch({ sort: "newest", size: 8 }).content,
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tn = await getTranslations("Nav");
  const { categories, top, fresh, highlights } = await loadHome();

  // constellation: the most rented and the newest listings, alternating (API: /api/listings/highlights);
  // without the API, as before: one standout listing per category from the bundled snapshot
  const featured = heroCards(highlights, top, categories);
  // bands: the four categories with the most listings, best-rated first
  const bandCats = [...categories].filter((c) => c.listingCount >= 3).sort((a, b) => b.listingCount - a.listingCount || a.sortOrder - b.sortOrder).slice(0, 4);
  const cities = ["Bakı", "Gəncə", "Sumqayıt"].map((city) => ({ city, count: top.filter((l) => l.city === city).length }));
  const cityEn: Record<string, string> = { Bakı: "Baku", Gəncə: "Ganja", Sumqayıt: "Sumgait" };

  return (
    <div data-zone="discovery" className="min-h-dvh bg-mist">
      <Link href="/host/listings/new" className="flex h-12 items-center justify-center gap-2 bg-black px-4 text-[14px] text-white">
        <span className="truncate">{tn("banner")}</span>
        <span className="hidden items-center gap-1 font-semibold sm:inline-flex">
          {tn("bannerCta")} <Icon name="arrowRight" size={14} strokeWidth={2} />
        </span>
      </Link>
      <div className="lg:flex">
        <DiscoveryRail />
        <div className="min-w-0 flex-1">
          <main id="main" className="animate-zone-in">
            <DiscoveryHero featured={featured} categories={categories} />

            <div className="mx-auto max-w-[1200px] space-y-16 2xl:max-w-[1440px] px-4 py-12 sm:px-6 lg:space-y-20 lg:px-8">
              {bandCats.map((c, i) => (
                <CategoryBand key={c.id} category={c} items={top.filter((l) => l.category.id === c.id)} locale={locale} flip={i % 2 === 1} />
              ))}

              <TileRow id="fresh" title={t("fresh")} href="/search?sort=newest" items={fresh} locale={locale} />

              <section aria-labelledby="cities">
                <h2 id="cities" className="mb-6 text-[20px] font-semibold tracking-tight-20">
                  {t("cityTitle")}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {cities.map(({ city, count }) => (
                    <li key={city}>
                      <Link
                        href={`/search?city=${encodeURIComponent(city)}`}
                        className="group flex min-h-[132px] flex-col justify-between rounded-pillow bg-slate-ink p-6 text-white transition-transform hover:-translate-y-0.5"
                      >
                        <span className="flex items-center justify-between text-[14px] text-[#d6d1ce]">
                          <span className="num">{t("cityCount", { count })}</span>
                          <Icon name="arrowRight" size={18} className="transition-transform group-hover:translate-x-1" />
                        </span>
                        <span className="text-[32px] font-semibold leading-none tracking-[-0.045em]">{locale === "en" ? cityEn[city] : city}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section id="how" aria-labelledby="how-title" className="scroll-mt-8">
                <h2 id="how-title" className="mb-6 text-[20px] font-semibold tracking-tight-20">
                  {t("howTitle")}
                </h2>
                <ol className="grid gap-3 md:grid-cols-3">
                  {([1, 2, 3] as const).map((n) => (
                    <li key={n} className="rounded-pillow bg-white p-6 shadow-[var(--shadow-float)]">
                      <span className="num text-[12px] font-medium text-stone">0{n}</span>
                      <h3 className="mt-6 text-[20px] font-semibold tracking-tight-20">{t(`how${n}t`)}</h3>
                      <p className="mt-2 text-[15px] leading-[1.45] text-stone">{t(`how${n}`)}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section aria-labelledby="host-cta" className="grid items-center gap-6 rounded-pillow bg-white p-6 shadow-[var(--shadow-float)] md:grid-cols-[1fr_auto] md:p-10">
                <div>
                  <h2 id="host-cta" className="text-[28px] font-semibold leading-[1.1] tracking-[-0.045em] sm:text-[34px]">
                    {t("hostTitle")}
                  </h2>
                  <p className="mt-3 max-w-xl text-[16px] leading-[1.45] text-stone">{t("hostText")}</p>
                </div>
                <Link
                  href="/host/listings/new"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet px-7 text-[16px] font-medium text-white shadow-[var(--shadow-violet)]"
                >
                  {t("hostCta")} <Icon name="arrowRight" size={18} />
                </Link>
              </section>
            </div>
          </main>
          <Footer tone="discovery" locale={locale} />
        </div>
      </div>
    </div>
  );
}
