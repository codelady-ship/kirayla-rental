import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { ListingView } from "@/components/market/listing-view";
import { serverGet } from "@/lib/api";
import { demoListing } from "@/lib/demo";
import { catName } from "@/lib/format";
import type { ListingDetail } from "@/lib/types";
import { alternates, SITE_URL } from "@/lib/site";

export const revalidate = 120;

/** Live listing, or the bundled snapshot while the API is cold (never for a genuine 404). */
const load = cache(async (id: number): Promise<{ listing: ListingDetail; demo: boolean } | null> => {
  if (!Number.isInteger(id) || id <= 0) return null;
  const { data, status } = await serverGet<ListingDetail>(`/api/listings/${id}`, 120);
  if (data) return { listing: data, demo: false };
  if (status === 404) return null;
  const snap = demoListing(id);
  return snap ? { listing: snap, demo: true } : null;
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const res = await load(Number(id));
  if (!res) return { title: locale === "en" ? "Listing not found" : "Elan tapılmadı", robots: { index: false } };
  const l = res.listing;
  const perDay = locale === "en" ? "day" : "gün";
  const description = `${l.dailyPrice} ₼ / ${perDay} · ${l.city} · ${catName(l.category, locale)}. ${l.description.slice(0, 120)}…`;
  return {
    title: `${l.title} — ${l.dailyPrice} ₼/${perDay}`,
    description,
    alternates: alternates(locale, `/listing/${l.id}`),
    openGraph: {
      type: "website",
      title: l.title,
      description,
      images: l.coverUrl ? [{ url: l.coverUrl, alt: l.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title: l.title, description, images: l.coverUrl ? [l.coverUrl] : undefined },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const res = await load(Number(id));
  if (!res) notFound();
  const l = res.listing;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title,
    description: l.description,
    image: l.photos.map((p) => p.url),
    category: catName(l.category, locale),
    url: `${SITE_URL}/${locale}/listing/${l.id}`,
    itemCondition: l.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      priceCurrency: "AZN",
      price: l.dailyPrice,
      priceSpecification: { "@type": "UnitPriceSpecification", price: l.dailyPrice, priceCurrency: "AZN", unitCode: "DAY", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" } },
      availability: "https://schema.org/InStock",
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      areaServed: l.city,
      seller: { "@type": "Person", name: l.host.name },
      offeredBy: { "@id": `${SITE_URL}/#org` },
    },
    ...(l.reviewCount > 0
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: l.ratingAvg, reviewCount: l.reviewCount, bestRating: 5, worstRating: 1 },
          review: l.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.author.name },
            reviewBody: r.comment,
            datePublished: r.createdAt.slice(0, 10),
          })),
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ListingView listing={l} demo={res.demo} />
    </>
  );
}
