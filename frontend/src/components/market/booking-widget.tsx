"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { daysBetween, fmtDay, money, quote } from "@/lib/format";
import type { ListingDetail } from "@/lib/types";
import { DateRangePicker } from "../date-range-picker";
import { Icon } from "../icons";
import { useAuth } from "../providers";
import { Stars } from "../ui";

type Range = { from: string | null; to: string | null };

export function rangeProblem(l: Pick<ListingDetail, "minDays" | "maxDays" | "unavailable">, r: Range, t: (k: string, v?: Record<string, number>) => string) {
  if (!r.from || !r.to) return null;
  const days = daysBetween(r.from, r.to);
  if (days < l.minDays) return t("tooShort", { min: l.minDays });
  if (days > l.maxDays) return t("tooLong", { max: l.maxDays });
  if (l.unavailable.some((u) => r.from! <= u.to && u.from <= r.to!)) return t("unavailable");
  return null;
}

/** Sticky reservation card: price per day, pick-up/return fields, calendar, live price breakdown, coral Reserve. */
export function BookingWidget({ listing: initial }: { listing: ListingDetail }) {
  const t = useTranslations("Booking");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState(initial);
  const [range, setRange] = useState<Range>({ from: null, to: null });
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const box = useRef<HTMLDivElement>(null);

  // the page may come from the ISR cache or the demo snapshot: refresh availability live
  useEffect(() => {
    api<ListingDetail>(`/api/listings/${initial.id}`, { auth: false })
      .then(setListing)
      .catch(() => {});
  }, [initial.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const own = user?.id === listing.hostId;
  const problem = rangeProblem(listing, range, t);
  const q = range.from && range.to && !problem ? quote(listing.dailyPrice, listing.deposit, range.from, range.to) : null;

  const reserve = () => {
    if (!range.from || !range.to || problem) {
      setOpen(true);
      return;
    }
    const target = `/checkout/${listing.id}?from=${range.from}&to=${range.to}`;
    router.push(user ? target : `/login?next=${encodeURIComponent(target)}`);
  };

  const field = "flex min-h-14 flex-col items-start justify-center px-3 py-2 text-left";

  return (
    <div ref={box} id="book" className="rounded-card border border-deco bg-white p-6 shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="num text-[22px] font-semibold">{money(listing.dailyPrice, locale)}</span> <span className="text-foggy">/ {tc("perDay")}</span>
        </p>
        <Stars value={listing.ratingAvg} count={listing.reviewCount} className="text-[14px]" />
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-[#b0b0b0]">
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className="grid w-full grid-cols-2 divide-x divide-[#b0b0b0]">
          <span className={field}>
            <span className="text-[10px] font-semibold uppercase tracking-wide">{t("pickup")}</span>
            <span className={`num text-[14px] ${range.from ? "" : "text-foggy"}`}>{range.from ? fmtDay(range.from, locale) : t("addDate")}</span>
          </span>
          <span className={field}>
            <span className="text-[10px] font-semibold uppercase tracking-wide">{t("return")}</span>
            <span className={`num text-[14px] ${range.to ? "" : "text-foggy"}`}>{range.to ? fmtDay(range.to, locale) : t("addDate")}</span>
          </span>
        </button>
      </div>

      {open && (
        <div id={panelId} className="mt-3 rounded-lg border border-hair p-3">
          <p className="mb-1 text-[14px] text-foggy">{t("pickHint")}</p>
          <DateRangePicker value={range} onChange={setRange} unavailable={listing.unavailable} />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] text-foggy">{t("minMax", { min: listing.minDays, max: listing.maxDays })}</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setRange({ from: null, to: null })} className="min-h-11 rounded-lg px-3 text-[14px] font-medium underline underline-offset-2">
                {t("clearDates")}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg bg-hof px-4 text-[14px] font-medium text-white">
                {tc("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {problem && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-[14px] text-coral-deep">
          <Icon name="x" size={16} /> {problem}
        </p>
      )}

      {own ? (
        <div className="mt-5 rounded-lg bg-faint p-4 text-[14px]">
          <p className="font-medium">{t("ownListing")}</p>
          <Link href={`/host/listings/${listing.id}`} className="mt-1 inline-flex min-h-11 items-center font-medium underline underline-offset-2">
            {t("manage")}
          </Link>
        </div>
      ) : (
        <button type="button" onClick={reserve} className="mt-5 min-h-12 w-full rounded-lg bg-coral-deep text-[16px] font-semibold text-white transition-colors hover:bg-[#c00837]">
          {range.from && range.to && !problem ? t("reserve") : t("pickDates")}
        </button>
      )}
      <p className="mt-3 text-center text-[14px] text-foggy">{t("notCharged")}</p>

      {q && (
        <dl className="mt-5 space-y-3 text-[15px]">
          <div className="flex justify-between">
            <dt className="underline decoration-deco underline-offset-2">{t("rentalLine", { price: money(listing.dailyPrice, locale), days: tc("day", { count: q.days }) })}</dt>
            <dd className="num">{money(q.rental, locale)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="underline decoration-deco underline-offset-2">{t("depositNote")}</dt>
            <dd className="num">{money(q.deposit, locale)}</dd>
          </div>
          <div className="flex justify-between border-t border-hair pt-4 font-semibold">
            <dt>{t("totalDue")}</dt>
            <dd className="num">{money(q.total, locale)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export function MobileBookBar({ listing }: { listing: ListingDetail }) {
  const t = useTranslations("Booking");
  const tc = useTranslations("Common");
  const locale = useLocale();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-hair bg-white px-4 py-3 lg:hidden">
      <p>
        <span className="num text-[16px] font-semibold">{money(listing.dailyPrice, locale)}</span> <span className="text-[14px] text-foggy">/ {tc("perDay")}</span>
        <span className="block text-[12px] text-foggy">
          {tc("deposit")}: <span className="num">{money(listing.deposit, locale)}</span>
        </span>
      </p>
      <a href="#book" className="inline-flex min-h-12 items-center rounded-lg bg-coral-deep px-6 text-[16px] font-semibold text-white">
        {t("pickDates")}
      </a>
    </div>
  );
}
