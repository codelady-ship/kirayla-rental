import { describe, expect, it } from "vitest";
import { demoCategories, demoSearch } from "@/lib/demo";
import { heroCards, placeInSpots, standoutPerCategory } from "@/lib/hero";

describe("placeInSpots", () => {
  it("gives the first four the spots every screen shows, then the wide-only spots, then the last one", () => {
    expect(placeInSpots(["r1", "n1", "r2", "n2", "r3", "n3", "r4"])).toEqual(["r1", "r3", "n1", "r2", "n2", "n3", "r4"]);
  });
  it("phones (first 6 spots) get the six best", () => {
    expect(placeInSpots([1, 2, 3, 4, 5, 6, 7]).slice(0, 6).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("keeps the order of a short list and never shows more than 7", () => {
    expect(placeInSpots([1, 2, 3])).toEqual([1, 2, 3]);
    expect(placeInSpots([1, 2, 3, 4, 5])).toEqual([1, 5, 2, 3, 4]);
    expect(placeInSpots([1, 2, 3, 4, 5, 6, 7, 8, 9])).toHaveLength(7);
    expect(placeInSpots([])).toEqual([]);
  });
});

describe("standoutPerCategory (no API: the bundled snapshot)", () => {
  it("is today's choice: the most reviewed listing with a photo per category, in category order", () => {
    const top = demoSearch({ sort: "rating", size: 48 }).content;
    const picked = standoutPerCategory(top, demoCategories);
    expect(picked.map((l) => l.category.id)).toEqual([...new Set(picked.map((l) => l.category.id))]);
    expect(picked.every((l) => l.coverUrl)).toBe(true);
    // the seven cards the live site shows today
    expect(picked.slice(0, 7).map((l) => l.title)).toEqual([
      "Studiya işıq dəsti: 2 softboks + dayaqlar",
      "Akkumulyatorlu drel-burğu dəsti",
      "4 nəfərlik kemp çadırı",
      'Dağ velosipedi Cube (29")',
      "Meta Quest 2 VR eynəyi",
      "Proyektor + 2.4 m ekran",
      "Azərbaycan milli geyimi (qadın və kişi)",
    ]);
  });
});

describe("heroCards", () => {
  const top = demoSearch({ sort: "rating", size: 48 }).content;
  it("without highlights it is exactly today's choice", () => {
    expect(heroCards(null, top, demoCategories)).toEqual(standoutPerCategory(top, demoCategories));
    expect(heroCards([], top, demoCategories)).toEqual(standoutPerCategory(top, demoCategories));
  });
  it("with highlights it shows them, placed, and tops up a short list without repeats", () => {
    const seven = top.slice(0, 7);
    expect(heroCards(seven, top, demoCategories)).toEqual(placeInSpots(seven));
    const two = heroCards(top.slice(0, 2), top, demoCategories);
    expect(two).toHaveLength(7);
    expect(new Set(two.map((l) => l.id)).size).toBe(7);
  });
});
