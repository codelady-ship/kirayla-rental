import { demoCategories } from "@/lib/demo";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/** Plain-language site summary for LLM crawlers (llmstxt.org). */
export function GET() {
  const cats = demoCategories.map((c) => `- [${c.nameEn} / ${c.nameAz}](${SITE_URL}/en/c/${c.slug})`).join("\n");
  const body = `# Share

> Share is a peer-to-peer rental marketplace for Azerbaijan (Baku, Ganja, Sumgait). People list their own things — cameras, drills, tents, bikes, game consoles, dresses — and rent them out by the day. Renters search, pick dates, send a booking request, and the owner accepts or declines. Prices are in Azerbaijani manat (AZN) per day plus a refundable deposit.

This is a portfolio project by a full-stack developer (Next.js + Java Spring Boot). Payments are not real.

## How renting works
- Search by keyword, category, city, daily price and free dates.
- Rental days are inclusive: picking up on the 3rd and returning on the 5th is 3 days. Price = days × daily price; the deposit is shown separately and returned when the item comes back.
- A request becomes a booking only after the host accepts it. Overlapping dates are rejected by the server.
- After a completed rental the renter can leave a 1–5 star review.

## Categories
${cats}

## Pages
- [Home (Azerbaijani)](${SITE_URL}/az)
- [Home (English)](${SITE_URL}/en)
- [All listings](${SITE_URL}/en/search)
- [Sitemap](${SITE_URL}/sitemap.xml)

## Source
- [GitHub repository](https://github.com/codelady-ship/kirayla-rental)
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
