import { describe, expect, it } from "vitest";
import { addDays, dayLabel, daysBetween, fmtDate, fmtRange, money, monthLabel, overlaps, quote } from "@/lib/format";

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
    expect(money(5882, "az")).toBe("5.882 ₼");
    expect(money(12345.5, "az")).toBe("12.345,50 ₼");
    expect(money(12345.5, "en")).toBe("12,345.50 ₼");
  });

  it("formats dates identically on server and client (no Intl, no time zone)", () => {
    expect(fmtRange("2026-11-28", "2026-12-02", "az")).toBe("28 noy – 2 dek 2026");
    expect(fmtRange("2026-11-28", "2026-12-02", "en")).toBe("28 Nov – 2 Dec 2026");
    expect(fmtDate("2026-03-01T17:17:18.025091", "az", { month: "long", year: "numeric" })).toBe("mart 2026");
    expect(fmtDate("2026-03-01T23:59:00", "en")).toBe("1 March 2026");
    expect(fmtDate("2026-03-01T07:05:00", "az", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })).toBe("1 mar, 07:05");
    expect(monthLabel("2026-08", "az")).toBe("avq");
    expect(dayLabel("2026-12-05", "az")).toBe("5 dekabr, şənbə");
    expect(dayLabel("2026-12-05", "en")).toBe("Saturday 5 December");
  });
});
