"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { catName, fmtDate, money } from "@/lib/format";
import type { Conversation, ListingDetail } from "@/lib/types";
import { Icon } from "../icons";
import { Modal } from "../modal";
import { useApiErrorToast, useAuth, useToast } from "../providers";
import { Avatar, DemoBanner, Stars } from "../ui";
import { BookingWidget, MobileBookBar } from "./booking-widget";
import { Gallery } from "./gallery";
import { HeartButton } from "./heart";

export function ListingView({ listing, demo }: { listing: ListingDetail; demo: boolean }) {
  const t = useTranslations("Listing");
  const tm = useTranslations("Messages");
  const tb = useTranslations("Booking");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const [msgOpen, setMsgOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const own = user?.id === listing.hostId;

  const requireLogin = (then: () => void) => (user ? then() : router.push(`/login?next=/listing/${listing.id}`));

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const c = await api<Conversation>("/api/conversations", { method: "POST", body: { listingId: listing.id, body: text.trim() } });
      toast(tm("sent"));
      setMsgOpen(false);
      setText("");
      router.push(`/messages/${c.id}`);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const sendReport = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/listings/${listing.id}/reports`, { method: "POST", body: { reason: text.trim() } });
      toast(t("reportSent"));
      setReportOpen(false);
      setText("");
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const conditionKey = `condition_${listing.condition}` as const;

  return (
    <>
      {demo && <DemoBanner />}
      <div className="mx-auto max-w-[1180px] px-4 pb-28 pt-4 sm:px-6 lg:px-10 lg:pb-16 lg:pt-6">
        <nav aria-label={t("breadcrumb")} className="mb-3 hidden text-[14px] text-foggy sm:block">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-hof hover:underline">
                {t("home")}
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href={`/c/${listing.category.slug}`} className="hover:text-hof hover:underline">
                {catName(listing.category, locale)}
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="max-w-[40ch] truncate text-hof">
              {listing.title}
            </li>
          </ol>
        </nav>

        <div className="mb-5 hidden flex-wrap items-end justify-between gap-3 sm:flex">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{listing.title}</h1>
          <div className="flex items-center gap-1">
            <HeartButton listingId={listing.id} variant="inline" />
          </div>
        </div>

        <Gallery photos={listing.photos} title={listing.title} />

        <h1 className="mt-5 text-[22px] font-semibold leading-tight tracking-[-0.02em] sm:hidden">{listing.title}</h1>

        <div className="mt-6 grid gap-12 lg:mt-10 lg:grid-cols-[1fr_380px] lg:gap-20">
          <div className="min-w-0">
            <div className="border-b border-hair pb-6">
              <p className="text-[18px] font-medium sm:text-[20px]">
                {catName(listing.category, locale)} · {listing.city}
                {listing.district ? `, ${listing.district}` : ""}
              </p>
              <p className="mt-1 text-[15px]">
                <Stars value={listing.ratingAvg} count={listing.reviewCount} />
              </p>
            </div>

            <div className="flex items-center gap-4 border-b border-hair py-6">
              <Avatar name={listing.host.name} src={listing.host.avatarUrl} size={44} />
              <div>
                <p className="font-medium">{t("hostedBy", { name: listing.host.name })}</p>
                <p className="text-[14px] text-foggy">{t("memberSince", { date: fmtDate(listing.host.joinedAt, locale, { month: "long", year: "numeric" }) })}</p>
              </div>
            </div>

            <section aria-labelledby="about" className="border-b border-hair py-8">
              <h2 id="about" className="mb-4 text-[22px] font-medium tracking-[-0.02em]">
                {t("about")}
              </h2>
              <p className="whitespace-pre-line text-[16px] leading-[1.6]">{listing.description}</p>
            </section>

            <section aria-labelledby="details" className="border-b border-hair py-8">
              <h2 id="details" className="mb-5 text-[22px] font-medium tracking-[-0.02em]">
                {t("details")}
              </h2>
              <dl className="grid gap-5 sm:grid-cols-2">
                {[
                  ["sparkle", t("condition"), t(conditionKey)],
                  ["calendar", t("rentalTerm"), t("termValue", { min: listing.minDays, max: listing.maxDays })],
                  ["pin", t("location"), `${listing.city}${listing.district ? `, ${listing.district}` : ""}`],
                  ["shield", tc("deposit"), money(listing.deposit, locale)],
                ].map(([icon, k, v]) => (
                  <div key={k} className="flex gap-4">
                    <Icon name={icon} size={24} strokeWidth={1.4} className="mt-0.5 shrink-0" />
                    <div>
                      <dt className="font-medium">{k}</dt>
                      <dd className="text-foggy">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="reviews" className="border-b border-hair py-8">
              <h2 id="reviews" className="mb-6 flex items-center gap-2 text-[22px] font-medium tracking-[-0.02em]">
                {listing.reviewCount > 0 && <Icon name="star" size={18} fill="currentColor" strokeWidth={0} />}
                {listing.reviewCount > 0 ? `${listing.ratingAvg.toFixed(2).replace(/0$/, "")} · ${tc("reviews", { count: listing.reviewCount })}` : t("reviewsTitle")}
              </h2>
              {listing.reviews.length === 0 ? (
                <p className="text-foggy">{t("noReviews")}</p>
              ) : (
                <ul className="grid gap-x-16 gap-y-8 md:grid-cols-2">
                  {listing.reviews.slice(0, 8).map((r) => (
                    <li key={r.id}>
                      <div className="flex items-center gap-3">
                        <Avatar name={r.author.name} src={r.author.avatarUrl} size={40} />
                        <div>
                          <p className="font-medium">{r.author.name}</p>
                          <p className="text-[14px] text-foggy">{fmtDate(r.createdAt, locale, { month: "long", year: "numeric" })}</p>
                        </div>
                      </div>
                      <p className="mt-2 flex gap-0.5" aria-label={tc("reviews", { count: 1 }) + `: ${r.rating}/5`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Icon key={i} name="star" size={11} fill={i < r.rating ? "currentColor" : "#dddddd"} strokeWidth={0} />
                        ))}
                      </p>
                      <p className="mt-2 leading-[1.55]">{r.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="host" className="py-8">
              <h2 id="host" className="mb-6 text-[22px] font-medium tracking-[-0.02em]">
                {t("hostedBy", { name: listing.host.name.split(" ")[0] })}
              </h2>
              <div className="grid gap-8 md:grid-cols-[300px_1fr] md:items-start">
                <div className="rounded-[20px] bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-center text-center">
                      <Avatar name={listing.host.name} src={listing.host.avatarUrl} size={88} />
                      <p className="mt-3 text-[22px] font-semibold leading-tight">{listing.host.name.split(" ")[0]}</p>
                      <p className="text-[13px] text-foggy">{listing.host.city}</p>
                    </div>
                    <dl className="flex-1 divide-y divide-hair text-[12px]">
                      <div className="pb-3">
                        <dd className="num text-[20px] font-semibold">{listing.host.reviewCount}</dd>
                        <dt>{t("reviewsTitle")}</dt>
                      </div>
                      <div className="py-3">
                        <dd className="num flex items-center gap-1 text-[20px] font-semibold">
                          {listing.host.ratingAvg ? listing.host.ratingAvg.toFixed(1) : "—"} <Icon name="star" size={12} fill="currentColor" strokeWidth={0} />
                        </dd>
                        <dt>{locale === "en" ? "Rating" : "Reytinq"}</dt>
                      </div>
                      <div className="pt-3">
                        <dd className="num text-[20px] font-semibold">{listing.host.listingCount}</dd>
                        <dt>{t("hostListings", { count: listing.host.listingCount }).replace(/^\d+\s/, "")}</dt>
                      </div>
                    </dl>
                  </div>
                </div>
                <div>
                  {listing.host.bio && <p className="leading-[1.6]">{listing.host.bio}</p>}
                  <p className="mt-3 text-[14px] text-foggy">{t("memberSince", { date: fmtDate(listing.host.joinedAt, locale, { month: "long", year: "numeric" }) })}</p>
                  {!own && (
                    <button type="button" onClick={() => requireLogin(() => setMsgOpen(true))} className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-hof px-6 text-[16px] font-medium text-white">
                      {t("messageHost")}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-6 text-[12px] text-foggy">
              <details>
                <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-2">{t("credits")}</summary>
                <ul className="mt-2 space-y-1">
                  {listing.photos.map((p, i) => (
                    <li key={p.id} translate="no">
                      {i + 1}.{" "}
                      {p.creditUrl ? (
                        <a href={p.creditUrl} className="underline underline-offset-2 hover:text-hof" rel="noopener nofollow" target="_blank">
                          {p.credit ?? p.creditUrl}
                        </a>
                      ) : (
                        (p.credit ?? listing.host.name)
                      )}
                    </li>
                  ))}
                </ul>
              </details>
              {!own && (
                <button type="button" onClick={() => requireLogin(() => setReportOpen(true))} className="inline-flex min-h-11 items-center gap-2 underline underline-offset-2 hover:text-hof">
                  <Icon name="flag" size={14} />
                  {t("report")}
                </button>
              )}
            </div>
          </div>

          <aside className="lg:relative" aria-label={tb("widgetTitle")}>
            <div className="lg:sticky lg:top-28">
              <BookingWidget listing={listing} />
            </div>
          </aside>
        </div>
      </div>
      {!own && <MobileBookBar listing={listing} />}

      <Modal open={msgOpen} onClose={() => setMsgOpen(false)} title={tm("startTitle", { name: listing.host.name })}>
        <form onSubmit={sendMessage}>
          <label htmlFor="msg-body" className="mb-2 block text-[14px] font-medium">
            {tm("label")}
          </label>
          <textarea id="msg-body" required maxLength={2000} className="market-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={tm("startPlaceholder")} />
          <button type="submit" disabled={busy} className="mt-4 min-h-12 w-full rounded-lg bg-hof text-[16px] font-medium text-white disabled:opacity-60">
            {tc("send")}
          </button>
        </form>
      </Modal>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={t("report")}>
        <form onSubmit={sendReport}>
          <label htmlFor="report-reason" className="mb-2 block text-[14px] font-medium">
            {t("reportReason")}
          </label>
          <textarea id="report-reason" required minLength={5} maxLength={500} className="market-input" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" disabled={busy} className="mt-4 min-h-12 w-full rounded-lg bg-hof text-[16px] font-medium text-white disabled:opacity-60">
            {tc("send")}
          </button>
        </form>
      </Modal>
    </>
  );
}
