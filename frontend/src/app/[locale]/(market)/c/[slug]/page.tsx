import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ResultsView } from "@/components/market/results";
import { demoCategories } from "@/lib/demo";
import { catName } from "@/lib/format";
import { alternates } from "@/lib/site";

// Category names are stable (seeded); the snapshot lets these pages prerender without the API.
export function generateStaticParams() {
  return demoCategories.map((c) => ({ slug: c.slug }));
}
export const dynamicParams = true;

function findCategory(slug: string) {
  return demoCategories.find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = findCategory(slug);
  if (!c) return {};
  const name = catName(c, locale);
  const description =
    locale === "en"
      ? `${name} for rent by the day in Baku, Ganja and Sumgait — ${c.listingCount}+ listings from local hosts on Share.`
      : `${name} günlük kirayə — Bakı, Gəncə və Sumqayıtda ${c.listingCount}+ elan. Share-də yerli ev sahiblərindən kirayə götür.`;
  return { title: name, description, alternates: alternates(locale, `/c/${slug}`), openGraph: { title: `${name} · Share`, description } };
}

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = findCategory(slug);
  // categories added later by an admin are not in the snapshot: still render, the API decides
  if (!c && !/^[a-z0-9-]{2,60}$/.test(slug)) notFound();
  return (
    <Suspense>
      <ResultsView fixedCategory={slug} heading={c ? catName(c, locale) : undefined} />
    </Suspense>
  );
}
