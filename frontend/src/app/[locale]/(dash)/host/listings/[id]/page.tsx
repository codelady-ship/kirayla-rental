import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListingEditor } from "@/components/dash/listing-editor";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dash" });
  return { title: t("formTitleEdit") };
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <ListingEditor id={Number(id)} />;
}
