import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // AI crawlers are welcome (GEO); private areas stay out of the index
    rules: [{ userAgent: "*", allow: "/", disallow: ["/az/host", "/en/host", "/az/admin", "/en/admin", "/az/checkout", "/en/checkout", "/az/messages", "/en/messages"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
