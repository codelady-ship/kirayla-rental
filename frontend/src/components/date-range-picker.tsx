"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { addDays, isoDay, parseDay, today } from "@/lib/format";
import type { Unavailable } from "@/lib/types";
import { Icon } from "./icons";

type Range = { from: string | null; to: string | null };
const TAG: Record<string, string> = { az: "az-Latn-AZ", en: "en-GB" };

function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const count = new Date(year, month + 1, 0).getDate();
  return { lead, days: Array.from({ length: count }, (_, i) => isoDay(new Date(year, month, i + 1))) };
}

/**
 * Two-month range calendar (one month on phones). Past days and unavailable days are disabled;
 * a range can never span an unavailable day. Arrow keys move between days (roving tabindex).
 */
export function DateRangePicker({
  value,
  onChange,
  unavailable,
  tone = "light",
  allowPast = false,
  showKinds = false,
}: {
  value: Range;
  onChange: (r: Range) => void;
  unavailable: Unavailable[];
  tone?: "light" | "dark";
  allowPast?: boolean;
  showKinds?: boolean;
}) {
  const t = useTranslations("Booking");
  const td = useTranslations("Dash");
  const locale = useLocale();
  const start = parseDay(value.from ?? today());
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const [focus, setFocus] = useState<string>(value.from ?? today());
  const grid = useRef<HTMLDivElement>(null);
  const min = today();

  const kindOf = useMemo(() => {
    return (d: string): Unavailable["kind"] | null => {
      for (const u of unavailable) if (d >= u.from && d <= u.to) return u.kind;
      return null;
    };
  }, [unavailable]);

  const disabled = (d: string) => (!allowPast && d < min) || (!showKinds && kindOf(d) !== null);
  const spansBlocked = (a: string, b: string) => unavailable.some((u) => a <= u.to && u.from <= b);

  const pick = (d: string) => {
    if (disabled(d)) return;
    const { from, to } = value;
    if (!from || to || d < from) return onChange({ from: d, to: null });
    if (!showKinds && spansBlocked(from, d)) return onChange({ from: d, to: null });
    onChange({ from, to: d });
  };

  const months = [0, 1].map((k) => {
    const date = new Date(view.y, view.m + k, 1);
    return { y: date.getFullYear(), m: date.getMonth(), label: new Intl.DateTimeFormat(TAG[locale] ?? locale, { month: "long", year: "numeric" }).format(date) };
  });
  // keep exactly one day reachable with Tab even when the remembered day scrolled out of view
  const firstMonthDays = monthDays(months[0].y, months[0].m).days.filter((d) => !disabled(d));
  const tabTarget = firstMonthDays.includes(focus) || monthDays(months[1].y, months[1].m).days.includes(focus) ? focus : firstMonthDays[0];
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(TAG[locale] ?? locale, { weekday: "narrow" }).format(new Date(2024, 0, 1 + i)));

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, d: string) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = addDays(d, delta);
    const nd = parseDay(next);
    const firstShown = new Date(view.y, view.m, 1);
    const lastShown = new Date(view.y, view.m + 2, 0);
    if (nd < firstShown) setView((v) => ({ y: new Date(v.y, v.m - 1, 1).getFullYear(), m: new Date(v.y, v.m - 1, 1).getMonth() }));
    if (nd > lastShown) setView((v) => ({ y: new Date(v.y, v.m + 1, 1).getFullYear(), m: new Date(v.y, v.m + 1, 1).getMonth() }));
    setFocus(next);
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
  };

  const dark = tone === "dark";
  const canPrev = allowPast || new Date(view.y, view.m, 1) > new Date(parseDay(min).getFullYear(), parseDay(min).getMonth(), 1);
  const nav = `flex size-11 items-center justify-center rounded-full disabled:opacity-30 ${dark ? "hover:bg-obsidian" : "hover:bg-faint"}`;
  const shift = (k: number) => setView((v) => ({ y: new Date(v.y, v.m + k, 1).getFullYear(), m: new Date(v.y, v.m + k, 1).getMonth() }));

  return (
    <div ref={grid} className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className={nav} onClick={() => shift(-1)} disabled={!canPrev} aria-label={t("prevMonth")}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <button type="button" className={nav} onClick={() => shift(1)} aria-label={t("nextMonth")}>
          <Icon name="chevronRight" size={18} />
        </button>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {months.map((mo, idx) => {
          const { lead, days } = monthDays(mo.y, mo.m);
          return (
            <div key={mo.label} className={idx === 1 ? "hidden md:block" : ""}>
              <h3 className="mb-3 text-center text-[15px] font-semibold capitalize" aria-live="polite">
                {mo.label}
              </h3>
              <div className={`grid grid-cols-7 text-center text-[12px] ${dark ? "text-ash" : "text-foggy"}`} aria-hidden="true">
                {weekdays.map((w, i) => (
                  <span key={i} className="py-1">
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7" role="group" aria-label={mo.label}>
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`l${i}`} />
                ))}
                {days.map((d) => {
                  const kind = kindOf(d);
                  const isOff = disabled(d);
                  const isStart = d === value.from;
                  const isEnd = d === value.to;
                  const inRange = value.from && value.to && d > value.from && d < value.to;
                  const label = new Intl.DateTimeFormat(TAG[locale] ?? locale, { weekday: "long", day: "numeric", month: "long" }).format(parseDay(d));
                  const status = kind === "BOOKED" ? td("legendBooked") : kind === "BLOCKED" ? td("legendBlocked") : "";
                  let cls = "relative mx-auto flex size-11 items-center justify-center rounded-full text-[14px] num transition-colors ";
                  if (isStart || isEnd) cls += dark ? "bg-cobalt text-white" : "bg-hof text-white";
                  else if (inRange) cls += dark ? "bg-cobalt/25 text-ivory" : "bg-faint text-hof";
                  else if (showKinds && kind === "BOOKED") cls += "bg-[#3b3f6b] text-ivory";
                  else if (showKinds && kind === "BLOCKED") cls += dark ? "bg-obsidian text-ash line-through" : "bg-faint line-through";
                  else if (isOff) cls += dark ? "text-[#5c5c6e] line-through" : "text-[#b0b0b0] line-through";
                  else cls += dark ? "text-ivory hover:ring-1 hover:ring-ivory" : "text-hof hover:ring-1 hover:ring-hof";
                  return (
                    <div key={d} className={`py-0.5 ${inRange ? (dark ? "bg-cobalt/10" : "bg-faint") : ""} ${isStart && value.to ? "rounded-l-full " + (dark ? "bg-cobalt/10" : "bg-faint") : ""} ${isEnd ? "rounded-r-full " + (dark ? "bg-cobalt/10" : "bg-faint") : ""}`}>
                      <button
                        type="button"
                        data-day={d}
                        tabIndex={d === tabTarget ? 0 : -1}
                        disabled={isOff}
                        aria-pressed={isStart || isEnd ? true : undefined}
                        aria-label={`${label}${status ? ` — ${status}` : ""}`}
                        onClick={() => pick(d)}
                        onKeyDown={(e) => onKey(e, d)}
                        onFocus={() => setFocus(d)}
                        className={cls}
                      >
                        {parseDay(d).getDate()}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
