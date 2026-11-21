import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ResultsView } from "@/components/market/results";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });
  return { title: t("allItems"), alternates: alternates(locale, "/search") };
}

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense>
      <ResultsView />
    </Suspense>
  );
}
