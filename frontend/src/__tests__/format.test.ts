import { describe, expect, it } from "vitest";
import { addDays, daysBetween, money, overlaps, quote } from "@/lib/format";

describe("rental maths", () => {
  it("counts rental days inclusively", () => {
    expect(daysBetween("2026-11-03", "2026-11-05")).toBe(3);
    expect(daysBetween("2026-11-03", "2026-11-03")).toBe(1);
  });

  it("crosses month and DST boundaries without drift", () => {
    expect(daysBetween("2026-03-28", "2026-04-02")).toBe(6);
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("prices = days × daily price, deposit shown separately", () => {
    expect(quote(45, 300, "2026-11-20", "2026-11-22")).toEqual({ days: 3, rental: 135, deposit: 300, total: 435 });
  });

  it("treats touching ranges as overlapping (inclusive days) and adjacent ones as free", () => {
    expect(overlaps({ from: "2026-11-01", to: "2026-11-05" }, { from: "2026-11-05", to: "2026-11-07" })).toBe(true);
    expect(overlaps({ from: "2026-11-01", to: "2026-11-05" }, { from: "2026-11-06", to: "2026-11-07" })).toBe(false);
  });

  it("formats manat", () => {
    expect(money(45, "en")).toBe("45 ₼");
    expect(money(12.5, "en")).toBe("12.50 ₼");
  });
});
