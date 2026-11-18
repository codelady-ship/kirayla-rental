"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { fmtRange, money, today } from "@/lib/format";
import type { Booking, BookingStatus } from "@/lib/types";
import { useRequireAuth } from "@/lib/use-require-auth";
import { Icon } from "../icons";
import { Modal } from "../modal";
import { useApiErrorToast, useToast } from "../providers";
import { Photo, Spinner } from "../ui";

const CHIP: Record<BookingStatus, string> = {
  REQUESTED: "bg-[#fff6e5] text-[#7a4b00]",
  ACCEPTED: "bg-[#e9f5ee] text-[#17603a]",
  DECLINED: "bg-faint text-foggy",
  CANCELLED: "bg-faint text-foggy",
  COMPLETED: "bg-[#eef0ff] text-[#2c3aa8]",
};

export function StatusChip({ status }: { status: BookingStatus }) {
  const t = useTranslations("Booking");
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${CHIP[status]}`}>{t(`status_${status}`)}</span>;
}

export function Trips() {
  const t = useTranslations("Trips");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { allowed } = useRequireAuth();
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const [items, setItems] = useState<Booking[] | null>(null);
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Booking[]>("/api/bookings/mine")
      .then(setItems)
      .catch((e) => {
        setItems([]);
        onError(e);
      });
  }, [onError]);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const cancel = async (b: Booking) => {
    if (!window.confirm(t("cancelConfirm"))) return;
    try {
      await api(`/api/bookings/${b.id}/cancel`, { method: "POST" });
      toast(t("cancelled"));
      load();
    } catch (e) {
      onError(e);
    }
  };

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewFor) return;
    setBusy(true);
    try {
      await api(`/api/bookings/${reviewFor.id}/review`, { method: "POST", body: { rating, comment: comment.trim() } });
      toast(t("reviewThanks"));
      setReviewFor(null);
      setComment("");
      setRating(5);
      load();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!allowed || !items) return <div className="flex justify-center py-24"><Spinner /></div>;

  const now = today();
  const upcoming = items.filter((b) => (b.status === "REQUESTED" || b.status === "ACCEPTED") && b.endDate >= now);
  const past = items.filter((b) => !upcoming.includes(b));

  const row = (b: Booking) => (
    <li key={b.id} className="grid gap-4 border-b border-hair py-6 sm:grid-cols-[132px_1fr_auto] sm:items-center">
      <Link href={`/listing/${b.listing.id}`} className="relative block aspect-[4/3] w-full overflow-hidden rounded-card bg-deco sm:aspect-square sm:w-[132px]">
        <Photo src={b.listing.coverUrl} alt="" fill sizes="(min-width: 640px) 132px, 100vw" className="object-cover" />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={b.status} />
          <span className="num text-[14px] text-foggy">{fmtRange(b.startDate, b.endDate, locale)}</span>
        </div>
        <h3 className="mt-2 truncate text-[17px] font-medium">
          <Link href={`/listing/${b.listing.id}`} className="hover:underline">
            {b.listing.title}
          </Link>
        </h3>
        <p className="text-[14px] text-foggy">
          {t("host")}: {b.host.name} · {b.listing.city}
        </p>
        <p className="num mt-1 text-[14px]">
          {tc("day", { count: b.days })} · <span className="font-semibold">{money(b.rentalTotal, locale)}</span>
          <span className="text-foggy"> + {tc("deposit").toLowerCase()} {money(b.deposit, locale)}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
        {b.status === "COMPLETED" && !b.reviewed && (
          <button type="button" onClick={() => setReviewFor(b)} className="min-h-11 rounded-lg bg-hof px-4 text-[14px] font-medium text-white">
            {t("review")}
          </button>
        )}
        {b.status === "COMPLETED" && b.reviewed && (
          <span className="inline-flex min-h-11 items-center gap-1.5 text-[14px] text-foggy">
            <Icon name="check" size={16} /> {t("reviewed")}
          </span>
        )}
        <Link href={b.conversationId ? `/messages/${b.conversationId}` : `/listing/${b.listing.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-hof px-4 text-[14px] font-medium hover:bg-faint">
          {t("message")}
        </Link>
        {(b.status === "REQUESTED" || (b.status === "ACCEPTED" && b.startDate > now)) && (
          <button type="button" onClick={() => cancel(b)} className="min-h-11 rounded-lg px-4 text-[14px] font-medium underline underline-offset-2">
            {t("cancel")}
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="mx-auto max-w-[960px] px-4 py-10 sm:px-6">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">{t("title")}</h1>
      {items.length === 0 ? (
        <div className="mt-8 rounded-card bg-faint px-6 py-14 text-center">
          <Icon name="calendar" size={32} className="mx-auto" />
          <p className="mt-4">{t("empty")}</p>
          <Link href="/search" className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-hof px-6 font-medium text-white">
            {t("explore")}
          </Link>
        </div>
      ) : (
        <>
          <section aria-labelledby="up" className="mt-8">
            <h2 id="up" className="text-[22px] font-medium">
              {t("upcoming")} <span className="num text-foggy">({upcoming.length})</span>
            </h2>
            <ul>{upcoming.map(row)}</ul>
          </section>
          <section aria-labelledby="past" className="mt-12">
            <h2 id="past" className="text-[22px] font-medium">
              {t("past")} <span className="num text-foggy">({past.length})</span>
            </h2>
            <ul>{past.map(row)}</ul>
          </section>
        </>
      )}

      <Modal open={!!reviewFor} onClose={() => setReviewFor(null)} title={t("reviewTitle")}>
        {reviewFor && (
          <form onSubmit={submitReview}>
            <p className="mb-4 text-[14px] text-foggy">{reviewFor.listing.title}</p>
            <fieldset>
              <legend className="mb-2 text-[14px] font-medium">{t("rating")}</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
                    <span className="flex size-11 items-center justify-center rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-hof">
                      <Icon name="star" size={28} strokeWidth={1.2} fill={n <= rating ? "#222" : "none"} />
                    </span>
                    <span className="sr-only">{t("stars", { n })}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="review-comment" className="mb-2 mt-5 block text-[14px] font-medium">
              {t("comment")}
            </label>
            <textarea id="review-comment" required minLength={5} maxLength={1000} className="market-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} />
            <button type="submit" disabled={busy} className="mt-5 min-h-12 w-full rounded-lg bg-coral-deep text-[16px] font-semibold text-white disabled:opacity-60">
              {t("submitReview")}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
