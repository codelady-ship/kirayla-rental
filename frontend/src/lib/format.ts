import type { CategoryRef } from "./types";

export const CITIES = ["Bakı", "Gəncə", "Sumqayıt"] as const;

export function money(value: number, locale = "az"): string {
  const n = new Intl.NumberFormat(locale === "az" ? "az-Latn-AZ" : "en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
  return `${n} ₼`;
}

export function catName(c: Pick<CategoryRef, "nameAz" | "nameEn">, locale: string) {
  return locale === "en" ? c.nameEn : c.nameAz;
}

// ---- dates (ISO yyyy-mm-dd, local calendar days, no time zone drift) -----------------------
export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

export function today(): string {
  return isoDay(new Date());
}

/** Rental days are inclusive: picking up on the 3rd and returning on the 5th is 3 days. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 864e5) + 1;
}

export function overlaps(a: { from: string; to: string }, b: { from: string; to: string }): boolean {
  return a.from <= b.to && b.from <= a.to;
}

export function quote(dailyPrice: number, deposit: number, from: string, to: string) {
  const days = daysBetween(from, to);
  const rental = Math.round(dailyPrice * days * 100) / 100;
  return { days, rental, deposit, total: rental + deposit };
}

const LOCALE_TAG: Record<string, string> = { az: "az-Latn-AZ", en: "en-GB" };

export function fmtDay(s: string, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? locale, opts).format(parseDay(s));
}

export function fmtRange(from: string, to: string, locale: string) {
  return `${fmtDay(from, locale)} – ${fmtDay(to, locale, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function fmtDate(iso: string, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? locale, opts).format(new Date(iso));
}

export function monthLabel(ym: string, locale: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? locale, { month: "short" }).format(new Date(y, m - 1, 1));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("az"))
    .join("");
}
