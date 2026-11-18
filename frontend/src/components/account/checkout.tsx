"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { fmtRange, money, quote } from "@/lib/format";
import type { Booking, ListingDetail } from "@/lib/types";
import { useRequireAuth } from "@/lib/use-require-auth";
import { Icon } from "../icons";
import { rangeProblem } from "../market/booking-widget";
import { useApiErrorToast, useToast } from "../providers";
import { Photo, Spinner, Stars } from "../ui";

export function Checkout({ id }: { id: number }) {
  const t = useTranslations("Booking");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const { allowed } = useRequireAuth();
  const from = sp.get("from");
  const to = sp.get("to");
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    api<ListingDetail>(`/api/listings/${id}`, { timeoutMs: 30000 })
      .then(setListing)
      .catch(() => setLoadError(true));
  }, [id]);

  if (!allowed) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (loadError) return <p role="alert" className="mx-auto max-w-xl px-4 py-24 text-center">{tc("network")}</p>;
  if (!listing) return <div className="flex justify-center py-24"><Spinner /></div>;

  const valid = from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to;
  const problem = valid ? rangeProblem(listing, { from, to }, t) : t("pickDates");
  const q = valid ? quote(listing.dailyPrice, listing.deposit, from!, to!) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || problem) return;
    setBusy(true);
    try {
      await api<Booking>("/api/bookings", { method: "POST", body: { listingId: listing.id, startDate: from, endDate: to, message: message.trim() || undefined } });
      toast(t("success"));
      router.replace("/trips");
    } catch (err) {
      if (err instanceof ApiError && err.code === "BOOKING_CONFLICT") setConflict(true);
      else onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 md:py-12 lg:px-10">
      <div className="mb-8 flex items-center gap-2">
        <Link href={`/listing/${listing.id}`} aria-label={tc("back")} className="-ml-3 flex size-11 items-center justify-center rounded-full hover:bg-faint">
          <Icon name="chevronLeft" />
        </Link>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px]">{t("checkoutTitle")}</h1>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:gap-20">
        <form onSubmit={submit} className="order-2 lg:order-1">
          <section aria-labelledby="trip" className="border-b border-hair pb-8">
            <h2 id="trip" className="mb-5 text-[22px] font-medium">
              {t("yourTrip")}
            </h2>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{t("dates")}</p>
                <p className="num text-foggy">{valid ? fmtRange(from!, to!, locale) : "—"}</p>
              </div>
              <Link href={`/listing/${listing.id}#book`} className="inline-flex min-h-11 items-center font-medium underline underline-offset-2">
                {tc("edit")}
              </Link>
            </div>
            {(problem || conflict) && (
              <p role="alert" className="mt-4 rounded-lg bg-[#fff0f2] px-4 py-3 text-[14px] text-[#9b0a2f]">
                {conflict ? t("conflict") : problem}{" "}
                <Link href={`/listing/${listing.id}#book`} className="font-medium underline">
                  {t("pickDates")}
                </Link>
              </p>
            )}
          </section>

          <section aria-labelledby="msg" className="border-b border-hair py-8">
            <h2 id="msg" className="mb-4 text-[22px] font-medium">
              <label htmlFor="booking-message">{t("messageLabel")}</label>
            </h2>
            <textarea id="booking-message" maxLength={500} className="market-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("messagePlaceholder")} />
          </section>

          <section aria-labelledby="rules" className="py-8">
            <h2 id="rules" className="mb-4 text-[22px] font-medium">
              {t("rules")}
            </h2>
            <ul className="space-y-3 text-[15px]">
              {(["rule1", "rule2", "rule3"] as const).map((r) => (
                <li key={r} className="flex gap-3">
                  <Icon name="check" size={20} className="mt-0.5 shrink-0" />
                  {t(r)}
                </li>
              ))}
            </ul>
          </section>

          <button
            type="submit"
            disabled={busy || !!problem || conflict}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-coral-deep px-8 text-[16px] font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            {busy && <Spinner />}
            {busy ? t("sending") : t("send")}
          </button>
          <p className="mt-3 text-[14px] text-foggy">{t("notCharged")}</p>
        </form>

        <aside className="order-1 h-fit rounded-card border border-deco p-6 lg:sticky lg:top-28 lg:order-2" aria-label={t("priceDetails")}>
          <div className="flex gap-4 border-b border-hair pb-6">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-lg bg-deco">
              <Photo src={listing.coverUrl} alt="" fill sizes="112px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium">{listing.title}</p>
              <p className="mt-1 text-[14px] text-foggy">{listing.city}</p>
              <p className="mt-2 text-[13px]">
                <Stars value={listing.ratingAvg} count={listing.reviewCount} size={12} />
              </p>
            </div>
          </div>
          <h2 className="pt-6 text-[20px] font-medium">{t("priceDetails")}</h2>
          {q ? (
            <dl className="mt-4 space-y-3 text-[15px]">
              <div className="flex justify-between">
                <dt>{t("rentalLine", { price: money(listing.dailyPrice, locale), days: tc("day", { count: q.days }) })}</dt>
                <dd className="num">{money(q.rental, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t("depositNote")}</dt>
                <dd className="num">{money(q.deposit, locale)}</dd>
              </div>
              <div className="flex justify-between border-t border-hair pt-4 text-[16px] font-semibold">
                <dt>{t("totalDue")} (AZN)</dt>
                <dd className="num">{money(q.total, locale)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-foggy">—</p>
          )}
        </aside>
      </div>
    </div>
  );
}
