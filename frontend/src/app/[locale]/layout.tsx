import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Providers } from "@/components/providers";
import { routing } from "@/i18n/routing";
import { alternates, SITE_NAME, SITE_URL } from "@/lib/site";
import "../globals.css";

// Inter covers the full Azerbaijani alphabet (Ə ə Ğ ğ İ ı Ö ö Ş ş Ç ç Ü ü)
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#f2f4f5", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · ${SITE_NAME}` },
    description: t("description"),
    applicationName: SITE_NAME,
    alternates: alternates(locale),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: t("title"),
      description: t("description"),
      url: `/${locale}`,
      locale: locale === "az" ? "az_AZ" : "en_US",
      alternateLocale: locale === "az" ? ["en_US"] : ["az_AZ"],
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [messages, t, tm] = await Promise.all([getMessages(), getTranslations("Common"), getTranslations("Meta")]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      description: tm("description"),
      areaServed: ["Bakı", "Gəncə", "Sumqayıt"].map((name) => ({ "@type": "City", name })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/${locale}`,
      inLanguage: locale,
      publisher: { "@id": `${SITE_URL}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/${locale}/search?q={query}`,
        "query-input": "required name=query",
      },
    },
  ];

  return (
    <html lang={locale} className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-[200] rounded-full bg-black px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          {t("skip")}
        </a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
