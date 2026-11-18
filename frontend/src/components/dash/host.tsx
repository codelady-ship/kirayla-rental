"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { fmtRange, monthLabel, money, today } from "@/lib/format";
import type { Booking, BookingStatus, Earnings, HostListing } from "@/lib/types";
import { Icon } from "../icons";
import { useApiErrorToast, useAuth, useToast } from "../providers";
import { Avatar, Photo, Spinner } from "../ui";
import { BarChart, BOOKING_TONE, Card, DButton, Empty, PageHead, Pill, Stat, Table } from "./kit";

/** Small loader for dashboard reads: data + reload, errors surface as toasts. */
export function useDash<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const onError = useApiErrorToast();
  const reload = useCallback(() => {
    if (!path) return;
    api<T>(path, { timeoutMs: 45000 })
      .then(setData)
      .catch(onError);
  }, [path, onError]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, reload, setData };
}

function useBookingAction(after: () => void) {
  const t = useTranslations("Dash");
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const [busy, setBusy] = useState<number | null>(null);
  const run = async (b: Booking, action: "accept" | "decline" | "complete") => {
    setBusy(b.id);
    try {
      await api(`/api/bookings/${b.id}/${action}`, { method: "POST" });
      toast(action === "accept" ? t("accepted") : action === "decline" ? t("declined") : t("completedToast"));
      after();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };
  return { run, busy };
}

function RequestRow({ b, onAction, busy, compact = false }: { b: Booking; onAction: (b: Booking, a: "accept" | "decline" | "complete") => void; busy: boolean; compact?: boolean }) {
  const t = useTranslations("Dash");
  const tb = useTranslations("Booking");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const canComplete = b.status === "ACCEPTED" && b.startDate <= today();
  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <Avatar name={b.renter.name} src={b.renter.avatarUrl} size={36} className="!bg-obsidian" />
          <div className="min-w-0">
            <p className="truncate text-ivory">{b.renter.name}</p>
            {!compact && b.message && <p className="max-w-[260px] truncate text-[12px] text-ash">“{b.message}”</p>}
          </div>
        </div>
      </td>
      <td className="max-w-[220px]">
        <Link href={`/listing/${b.listing.id}`} className="block truncate text-ivory hover:underline">
          {b.listing.title}
        </Link>
      </td>
      <td className="num whitespace-nowrap text-ash">
        {fmtRange(b.startDate, b.endDate, locale)} · {tc("day", { count: b.days })}
      </td>
      <td className="num whitespace-nowrap">{money(b.rentalTotal, locale)}</td>
      <td>
        <Pill tone={BOOKING_TONE[b.status]}>{tb(`status_${b.status}`)}</Pill>
      </td>
      <td>
        <div className="flex justify-end gap-2">
          {b.status === "REQUESTED" && (
            <>
              <DButton variant="ghost" disabled={busy} onClick={() => onAction(b, "accept")} aria-label={`${t("accept")}: ${b.renter.name}, ${b.listing.title}`}>
                <Icon name="check" size={16} /> {t("accept")}
              </DButton>
              <DButton variant="quiet" disabled={busy} onClick={() => onAction(b, "decline")} aria-label={`${t("decline")}: ${b.renter.name}, ${b.listing.title}`}>
                {t("decline")}
              </DButton>
            </>
          )}
          {canComplete && (
            <DButton variant="ghost" disabled={busy} onClick={() => onAction(b, "complete")}>
              {t("complete")}
            </DButton>
          )}
          {b.conversationId && (
            <Link href={`/messages/${b.conversationId}`} aria-label={`${tc("send")}: ${b.renter.name}`} className="flex size-11 items-center justify-center rounded-full text-ash hover:bg-obsidian hover:text-ivory">
              <Icon name="message" size={18} />
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

export function HostOverview() {
  const t = useTranslations("Dash");
  const locale = useLocale();
  const { user } = useAuth();
  const earnings = useDash<Earnings>("/api/host/earnings");
  const incoming = useDash<Booking[]>("/api/bookings/incoming?status=REQUESTED");
  const reload = () => {
    earnings.reload();
    incoming.reload();
  };
  const { run, busy } = useBookingAction(reload);
  const e = earnings.data;
  const fm = (n: number) => money(n, locale);

  return (
    <>
      <PageHead title={t("greeting", { name: user?.name.split(" ")[0] ?? "" })} sub={t("hostSub")} />
      {!e ? (
        <div className="flex justify-center py-16 text-ash">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("totalEarned")} value={fm(e.totalEarned)} />
            <Stat label={t("upcoming")} value={fm(e.upcoming)} />
            <Stat label={t("pending")} value={String(e.pendingRequests)} />
            <Stat label={t("completed")} value={String(e.completedCount)} hint={`${t("avgPrice")}: ${fm(e.averageDailyPrice)}`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card title={t("earningsChart")} sub={t("earningsChartDesc")}>
              <BarChart label={t("earningsChart")} format={(n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)))} data={e.monthly.map((m) => ({ label: monthLabel(m.month, locale), value: m.amount }))} />
            </Card>
            <Card title={t("topListings")}>
              {e.topListings.length === 0 ? (
                <Empty>—</Empty>
              ) : (
                <ol className="space-y-4">
                  {e.topListings.map((l, i) => (
                    <li key={l.id} className="flex items-center gap-4">
                      <span className="num w-5 text-[14px] text-ash">{i + 1}</span>
                      <Link href={`/host/listings/${l.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        {l.title}
                      </Link>
                      <span className="num shrink-0 text-[14px]">{fm(l.amount)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <Card title={t("incoming")} action={<Link href="/host/bookings" className="inline-flex min-h-11 items-center text-[14px] text-ash underline-offset-4 hover:text-ivory hover:underline">{t("filterAll")} →</Link>}>
            {!incoming.data ? (
              <Spinner />
            ) : incoming.data.length === 0 ? (
              <Empty>{t("noRequests")}</Empty>
            ) : (
              <Table head={[t("renter"), t("listing"), t("dates"), t("amount"), t("status"), ""]} minWidth={860}>
                {incoming.data.map((b) => (
                  <RequestRow key={b.id} b={b} onAction={run} busy={busy === b.id} />
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

const FILTERS: (BookingStatus | "ALL")[] = ["ALL", "REQUESTED", "ACCEPTED", "COMPLETED", "DECLINED", "CANCELLED"];

export function HostBookings() {
  const t = useTranslations("Dash");
  const tb = useTranslations("Booking");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const list = useDash<Booking[]>(`/api/bookings/incoming${filter === "ALL" ? "" : `?status=${filter}`}`);
  const { run, busy } = useBookingAction(list.reload);
  return (
    <>
      <PageHead title={t("bookings")} sub={t("incoming")} />
      <div role="group" aria-label={t("status")} className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 shrink-0 rounded-[40px] border px-4 text-[14px] transition-colors ${filter === f ? "border-ivory bg-ivory text-onyx" : "border-slate-line text-ash hover:text-ivory"}`}
          >
            {f === "ALL" ? t("filterAll") : tb(`status_${f}`)}
          </button>
        ))}
      </div>
      <Card>
        {!list.data ? (
          <Spinner />
        ) : list.data.length === 0 ? (
          <Empty>{t("noRequests")}</Empty>
        ) : (
          <Table head={[t("renter"), t("listing"), t("dates"), t("amount"), t("status"), ""]} minWidth={900}>
            {list.data.map((b) => (
              <RequestRow key={b.id} b={b} onAction={run} busy={busy === b.id} />
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

export function HostListings() {
  const t = useTranslations("Dash");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const list = useDash<HostListing[]>("/api/host/listings");

  const archive = async (l: HostListing) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await api(`/api/listings/${l.id}`, { method: "DELETE" });
      toast(t("deleted"));
      list.reload();
    } catch (e) {
      onError(e);
    }
  };

  return (
    <>
      <PageHead
        title={t("listings")}
        action={
          <Link href="/host/listings/new" className="inline-flex min-h-11 items-center gap-2 rounded-[32px] bg-cobalt px-5 text-[15px] text-white lg:hidden">
            <Icon name="plus" size={18} /> {t("newListing")}
          </Link>
        }
      />
      {!list.data ? (
        <div className="flex justify-center py-16 text-ash">
          <Spinner />
        </div>
      ) : list.data.length === 0 ? (
        <Empty>{t("noListings")}</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.data.map((l) => (
            <li key={l.id} className="flex flex-col overflow-hidden rounded-[12px] bg-graphite">
              <Link href={`/host/listings/${l.id}`} className="relative block aspect-[16/10] bg-obsidian">
                <Photo src={l.coverUrl} alt="" fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" className="object-cover opacity-90" />
                <span className="absolute left-3 top-3 flex gap-1.5">
                  {l.status !== "ACTIVE" && <span className="rounded-[40px] bg-onyx/85 px-2.5 py-1 text-[12px]">{t(`status_${l.status}`)}</span>}
                  {l.pendingCount > 0 && <span className="rounded-[40px] bg-ivory px-2.5 py-1 text-[12px] text-onyx">{t("pendingBadge", { count: l.pendingCount })}</span>}
                </span>
              </Link>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="truncate text-[16px] font-[480]">{l.title}</h2>
                <p className="num mt-1 text-[14px] text-ash">
                  {money(l.dailyPrice, locale)} / {tc("perDay")} · {l.city}
                </p>
                <p className="num mt-1 text-[12px] text-ash">
                  {t("photos", { count: l.photoCount })} · {t("bookingsCount", { count: l.bookingCount })}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/host/listings/${l.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-[32px] border border-ivory/80 px-4 text-[14px] hover:bg-obsidian">
                    <Icon name="calendar" size={16} /> {tc("edit")}
                  </Link>
                  <Link href={`/listing/${l.id}`} className="inline-flex min-h-11 items-center rounded-[32px] px-4 text-[14px] text-ash hover:bg-obsidian hover:text-ivory">
                    {t("view")}
                  </Link>
                  <button type="button" onClick={() => archive(l)} aria-label={`${tc("delete")}: ${l.title}`} className="ml-auto flex size-11 items-center justify-center rounded-full text-ash hover:bg-obsidian hover:text-ivory">
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
