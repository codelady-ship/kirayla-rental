import type { CategoryRef } from "./types";

export const CITIES = ["Bakı", "Gəncə", "Sumqayıt"] as const;

// Formatting is done by hand, not with Intl: Node and browsers ship different CLDR data for "az"
// (weekday and month names, digit grouping), which made server and client HTML disagree (hydration error #418).
export function money(value: number, locale = "az"): string {
  const fixed = value % 1 === 0 ? String(Math.round(value)) : value.toFixed(2);
  const [int, frac] = fixed.split(".");
  const az = locale === "az";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, az ? "." : ",");
  return `${grouped}${frac ? (az ? "," : ".") + frac : ""} ₼`;
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

const MONTHS: Record<string, { long: string[]; short: string[] }> = {
  az: {
    long: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
    short: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"],
  },
  en: {
    long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};
/** Monday first. */
const WEEKDAYS: Record<string, { long: string[]; narrow: string[] }> = {
  az: {
    long: ["bazar ertəsi", "çərşənbə axşamı", "çərşənbə", "cümə axşamı", "cümə", "şənbə", "bazar"],
    narrow: ["B.e", "Ç.a", "Ç", "C.a", "C", "Ş", "B"],
  },
  en: {
    long: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    narrow: ["M", "T", "W", "T", "F", "S", "S"],
  },
};
const names = (locale: string) => MONTHS[locale] ?? MONTHS.az;

export type DateStyle = { day?: "numeric"; month?: "short" | "long"; year?: "numeric"; hour?: "2-digit"; minute?: "2-digit" };

function compose(y: number, m: number, d: number, locale: string, o: DateStyle, time?: string) {
  const parts: string[] = [];
  if (o.day) parts.push(String(d));
  if (o.month) parts.push(names(locale)[o.month][m - 1]);
  if (o.year) parts.push(String(y));
  const date = parts.join(" ");
  return o.hour && time ? `${date}, ${time}` : date;
}

/** "2026-12-05" → "5 dek" */
export function fmtDay(s: string, locale: string, opts: DateStyle = { day: "numeric", month: "short" }) {
  const [y, m, d] = s.split("-").map(Number);
  return compose(y, m, d, locale, opts);
}

export function fmtRange(from: string, to: string, locale: string) {
  return `${fmtDay(from, locale)} – ${fmtDay(to, locale, { day: "numeric", month: "short", year: "numeric" })}`;
}

/**
 * API timestamps are Baku wall-clock time without a zone ("2026-03-01T17:17:18"); they are shown as written,
 * so the server render and every visitor's browser print the same text whatever their own time zone is.
 */
export function fmtDate(iso: string, locale: string, opts: DateStyle = { day: "numeric", month: "long", year: "numeric" }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return iso;
  return compose(Number(m[1]), Number(m[2]), Number(m[3]), locale, opts, m[4] ? `${m[4]}:${m[5]}` : undefined);
}

/** "2026-03" → "mar" */
export function monthLabel(ym: string, locale: string) {
  return names(locale).short[Number(ym.split("-")[1]) - 1];
}

/** Calendar heading: "dekabr 2026" */
export function monthTitle(year: number, month0: number, locale: string) {
  return `${names(locale).long[month0]} ${year}`;
}

export function weekdayNarrow(locale: string) {
  return (WEEKDAYS[locale] ?? WEEKDAYS.az).narrow;
}

/** Accessible day name: "5 dekabr, şənbə" / "Saturday 5 December" */
export function dayLabel(s: string, locale: string) {
  const d = parseDay(s);
  const wd = (WEEKDAYS[locale] ?? WEEKDAYS.az).long[(d.getDay() + 6) % 7];
  const dm = `${d.getDate()} ${names(locale).long[d.getMonth()]}`;
  return locale === "en" ? `${wd} ${dm}` : `${dm}, ${wd}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("az"))
    .join("");
}
