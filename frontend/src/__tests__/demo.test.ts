import { describe, expect, it } from "vitest";
import { demoCategories, demoListing, demoSearch } from "@/lib/demo";

describe("cold-start demo snapshot", () => {
  it("mirrors the seed: 40 listings in 10 categories", () => {
    expect(demoCategories).toHaveLength(10);
    expect(demoSearch({ size: 48 }).totalElements).toBe(40);
  });

  it("filters like the API (category, city, price) and pages", () => {
    const photo = demoSearch({ category: "foto-video" });
    expect(photo.content.every((l) => l.category.slug === "foto-video")).toBe(true);
    const ganja = demoSearch({ city: "Gəncə", size: 48 });
    expect(ganja.content.length).toBeGreaterThan(0);
    expect(ganja.content.every((l) => l.city === "Gəncə")).toBe(true);
    const cheap = demoSearch({ maxPrice: 10, sort: "price_asc", size: 48 });
    expect(cheap.content.every((l) => l.dailyPrice <= 10)).toBe(true);
    expect(cheap.content.map((l) => l.dailyPrice)).toEqual([...cheap.content.map((l) => l.dailyPrice)].sort((a, b) => a - b));
    const p1 = demoSearch({ page: 1, size: 12 });
    expect(p1.page).toBe(1);
    expect(p1.totalPages).toBe(4);
  });

  it("matches Azerbaijani text case-insensitively", () => {
    expect(demoSearch({ q: "ÇADIR" }).totalElements).toBeGreaterThan(0);
  });

  it("every listing has a credited, licence-safe photo", () => {
    for (let id = 1; id <= 40; id++) {
      const l = demoListing(id)!;
      expect(l.photos.length).toBeGreaterThan(0);
      for (const p of l.photos) {
        expect(p.url).toMatch(/^https://thumb.wikimedia.org//);
        expect(p.credit).toMatch(/(CC0|Public domain|CC BY)/);
      }
    }
  });
});
