import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wishlist } from "@/components/account/wishlist-profile";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Wishlist" });
  return { title: t("title"), robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Wishlist />;
}
