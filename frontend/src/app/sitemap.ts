import type { MetadataRoute } from "next";
import { serverGet } from "@/lib/api";
import { demoCategories, demoListings } from "@/lib/demo";
import { SITE_URL } from "@/lib/site";
import type { ListingCard, Page } from "@/lib/types";

export const revalidate = 3600;

function entry(path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap {
  const languages = { az: `${SITE_URL}/az${path}`, en: `${SITE_URL}/en${path}`, "x-default": `${SITE_URL}/az${path}` };
  return (["az", "en"] as const).map((l) => ({
    url: `${SITE_URL}/${l}${path}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    changeFrequency: "daily" as const,
    priority: l === "az" ? priority : priority - 0.1,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const live = await serverGet<Page<ListingCard>>("/api/listings?size=48&sort=newest", 3600);
  const listings = live.data?.content ?? demoListings;
  return [
    ...entry("", 1),
    ...entry("/search", 0.8),
    ...demoCategories.flatMap((c) => entry(`/c/${c.slug}`, 0.8)),
    ...listings.flatMap((l) => entry(`/listing/${l.id}`, 0.6, l.createdAt)),
  ];
}
