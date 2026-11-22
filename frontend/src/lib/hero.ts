import type { Category, ListingCard } from "./types";

/** How many floating cards the home hero shows (SPOTS in components/discovery/hero.tsx). */
export const HERO_CARDS = 7;

/**
 * Today's choice, used whenever the API's highlights are not available (no API configured, API asleep or
 * an older API without the endpoint): one standout listing per category, most reviewed first.
 */
export function standoutPerCategory(top: ListingCard[], categories: Category[]): ListingCard[] {
  const featured: ListingCard[] = [];
  const byReviews = [...top].sort((a, b) => b.reviewCount - a.reviewCount || b.ratingAvg - a.ratingAvg || a.id - b.id);
  for (const c of categories) {
    const best = byReviews.find((l) => l.category.id === c.id && l.coverUrl);
    if (best) featured.push(best);
  }
  return featured;
}

/**
 * The hero's cards: the API's highlights when it sent any (topped up with today's choice if it sent fewer
 * than {@link HERO_CARDS}), otherwise today's choice unchanged.
 */
export function heroCards(highlights: ListingCard[] | null, top: ListingCard[], categories: Category[]): ListingCard[] {
  const standout = standoutPerCategory(top, categories);
  if (!highlights?.length) return standout;
  const seen = new Set(highlights.map((l) => l.id));
  return placeInSpots([...highlights, ...standout.filter((l) => !seen.has(l.id))]);
}

/**
 * Puts the API's highlights (best first: most rented, newest, most rented, …) into the hero's spots so the
 * best ones are seen everywhere: phones show spots 0–5, 1024–1279 px hides spots 1 and 5 (wideOnly),
 * 1280 px and up shows all 7. Spots 0, 2, 3, 4 take the first four, 1 and 5 the next two, 6 the last.
 */
export function placeInSpots<T>(byPriority: T[]): T[] {
  const spotOfRank = [0, 2, 3, 4, 1, 5, 6];
  const out: (T | undefined)[] = [];
  byPriority.slice(0, HERO_CARDS).forEach((item, rank) => (out[spotOfRank[rank]] = item));
  return out.filter((x): x is T => x !== undefined);
}
