"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { api, toQuery } from "@/lib/api";
import { fmtDate, fmtRange, monthLabel, money } from "@/lib/format";
import type { AdminListing, AdminStats, AdminUser, Booking, BookingStatus, Category, Page, Report, ReportStatus } from "@/lib/types";
import { Icon } from "../icons";
import { Modal } from "../modal";
import { useApiErrorToast, useAuth, useToast } from "../providers";
import { Avatar, Pager, Photo, Spinner } from "../ui";
import { useDash } from "./host";
import { BarChart, BOOKING_TONE, Card, DButton, Empty, PageHead, Pill, Stat, Table } from "./kit";

function useMutate(after: () => void) {
  const t = useTranslations("Dash");
  const { toast } = useToast();
  const onError = useApiErrorToast();
  return async (path: string, method: "PATCH" | "POST" | "PUT" | "DELETE", body?: unknown) => {
    try {
      await api(path, { method, body });
      toast(t("saved"));
      after();
      return true;
    } catch (e) {
      onError(e);
      return false;
    }
  };
}

function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const t = useTranslations("Dash");
  const [q, setQ] = useState(value);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(q.trim());
      }}
      className="flex w-full max-w-sm items-center gap-2"
    >
      <label htmlFor="admin-q" className="sr-only">
        {t("search")}
      </label>
      <input id="admin-q" className="dash-input" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
      <DButton type="submit" variant="ghost" aria-label={t("search")} className="!px-3.5">
        <Icon name="search" size={18} />
      </DButton>
    </form>
  );
}

function Chips<T extends string>({ options, value, onChange, label }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={`min-h-11 shrink-0 rounded-[40px] border px-4 text-[14px] transition-colors ${value === o.v ? "border-ivory bg-ivory text-onyx" : "border-slate-line text-ash hover:text-ivory"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AdminOverview() {
  const t = useTranslations("Dash");
  const tb = useTranslations("Booking");
  const locale = useLocale();
  const { data: s } = useDash<AdminStats>("/api/admin/stats");
  if (!s)
    return (
      <div className="flex justify-center py-16 text-ash">
        <Spinner />
      </div>
    );
  const statuses = Object.entries(s.bookingsByStatus) as [BookingStatus, number][];
  const totalB = Math.max(1, statuses.reduce((a, [, n]) => a + n, 0));
  return (
    <>
      <PageHead title={t("admin")} sub={t("adminSub")} />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
          <Stat label={t("users")} value={String(s.users)} />
          <Stat label={t("activeListings")} value={`${s.activeListings}`} hint={`${s.listings} · ${t("status_HIDDEN")}: ${s.hiddenListings}`} />
          <Stat label={t("gmv")} value={money(s.gmv, locale)} hint={`${s.bookings} ${t("allBookings").toLowerCase()}`} />
          <Stat label={t("openReports")} value={String(s.openReports)} />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title={t("signups")} sub={t("signupsDesc")}>
            <BarChart label={t("signups")} format={(n) => String(n)} data={s.signupsByMonth.map((m) => ({ label: monthLabel(m.month, locale), value: m.count }))} />
          </Card>
          <Card title={t("byStatus")}>
            <ul className="space-y-4">
              {statuses.map(([st, n]) => (
                <li key={st}>
                  <div className="mb-1.5 flex justify-between text-[14px]">
                    <span>{tb(`status_${st}`)}</span>
                    <span className="num text-ash">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-obsidian" aria-hidden="true">
                    <div className="h-full rounded-full bg-ivory/80" style={{ width: `${(n / totalB) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["/admin/reports", t("reports"), "flag"],
            ["/admin/listings", t("allListings"), "grid"],
            ["/admin/users", t("users"), "users"],
          ].map(([href, label, icon]) => (
            <Link key={href} href={href} className="flex min-h-16 items-center gap-3 rounded-[12px] bg-graphite px-6 hover:bg-obsidian">
              <Icon name={icon} size={20} /> {label}
              <Icon name="arrowRight" size={16} className="ml-auto text-ash" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export function AdminUsers() {
  const t = useTranslations("Dash");
  const locale = useLocale();
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const list = useDash<Page<AdminUser>>(`/api/admin/users${toQuery({ q, page, size: 20 })}`);
  const mutate = useMutate(list.reload);
  return (
    <>
      <PageHead title={t("users")} action={<SearchBox value={q} onSearch={(v) => { setQ(v); setPage(0); }} />} />
      <Card>
        {!list.data ? (
          <Spinner />
        ) : list.data.content.length === 0 ? (
          <Empty>—</Empty>
        ) : (
          <Table head={[t("name"), t("role"), t("allListings"), t("allBookings"), t("joined"), t("status"), ""]} minWidth={940}>
            {list.data.content.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size={36} className="!bg-obsidian" />
                    <div className="min-w-0">
                      <p className="truncate text-ivory">{u.name}</p>
                      <p className="truncate text-[12px] text-ash">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="flex flex-wrap gap-1.5">
                    <Pill tone={u.role === "ADMIN" ? "info" : "neutral"}>{u.role}</Pill>
                    {u.readOnly && <Pill>{t("readOnlyBadge")}</Pill>}
                  </span>
                </td>
                <td className="num">{u.listingCount}</td>
                <td className="num">{u.bookingCount}</td>
                <td className="num whitespace-nowrap text-ash">{fmtDate(u.joinedAt, locale, { day: "numeric", month: "short", year: "numeric" })}</td>
                <td>
                  <Pill tone={u.enabled ? "good" : "bad"}>{u.enabled ? t("enabled") : t("disabled")}</Pill>
                </td>
                <td>
                  {u.id !== me?.id && (
                    <div className="flex justify-end gap-2">
                      <DButton variant="quiet" onClick={() => mutate(`/api/admin/users/${u.id}`, "PATCH", { enabled: !u.enabled })}>
                        {u.enabled ? t("block") : t("unblockUser")}
                      </DButton>
                      <DButton variant="quiet" onClick={() => mutate(`/api/admin/users/${u.id}`, "PATCH", { role: u.role === "ADMIN" ? "USER" : "ADMIN" })}>
                        {u.role === "ADMIN" ? t("makeUser") : t("makeAdmin")}
                      </DButton>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {list.data && <Pager page={list.data.page} totalPages={list.data.totalPages} onPage={setPage} tone="dark" />}
      </Card>
    </>
  );
}

export function AdminListings() {
  const t = useTranslations("Dash");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "HIDDEN" | "ARCHIVED">("");
  const [page, setPage] = useState(0);
  const list = useDash<Page<AdminListing>>(`/api/admin/listings${toQuery({ q, status, page, size: 20 })}`);
  const mutate = useMutate(list.reload);
  return (
    <>
      <PageHead title={t("allListings")} action={<SearchBox value={q} onSearch={(v) => { setQ(v); setPage(0); }} />} />
      <div className="mb-6">
        <Chips
          label={t("status")}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
          options={[
            { v: "", label: t("filterAll") },
            { v: "ACTIVE", label: t("status_ACTIVE") },
            { v: "HIDDEN", label: t("status_HIDDEN") },
            { v: "ARCHIVED", label: t("status_ARCHIVED") },
          ]}
        />
      </div>
      <Card>
        {!list.data ? (
          <Spinner />
        ) : list.data.content.length === 0 ? (
          <Empty>—</Empty>
        ) : (
          <Table head={[t("listing"), t("host"), t("fCity"), t("fPrice"), t("reports"), t("status"), ""]} minWidth={980}>
            {list.data.content.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-[8px] bg-obsidian">
                      <Photo src={l.coverUrl} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <div className="min-w-0 max-w-[260px]">
                      <Link href={`/listing/${l.id}`} className="block truncate text-ivory hover:underline">
                        {l.title}
                      </Link>
                      <p className="truncate text-[12px] text-ash">{locale === "en" ? l.categoryNameEn : l.categoryNameAz}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap">{l.hostName}</td>
                <td>{l.city}</td>
                <td className="num whitespace-nowrap">{money(l.dailyPrice, locale)}</td>
                <td>{l.reportCount > 0 ? <Pill tone="warn">{t("reportsCount", { count: l.reportCount })}</Pill> : <span className="text-ash">—</span>}</td>
                <td>
                  <Pill tone={l.status === "ACTIVE" ? "good" : l.status === "HIDDEN" ? "bad" : "neutral"}>{t(`status_${l.status}`)}</Pill>
                </td>
                <td>
                  <div className="flex justify-end">
                    {l.status !== "ARCHIVED" && (
                      <DButton variant="quiet" onClick={() => mutate(`/api/admin/listings/${l.id}`, "PATCH", { status: l.status === "ACTIVE" ? "HIDDEN" : "ACTIVE" })}>
                        <Icon name={l.status === "ACTIVE" ? "eyeOff" : "eye"} size={16} />
                        {l.status === "ACTIVE" ? t("hide") : t("show")}
                      </DButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {list.data && <Pager page={list.data.page} totalPages={list.data.totalPages} onPage={setPage} tone="dark" />}
      </Card>
    </>
  );
}

export function AdminBookings() {
  const t = useTranslations("Dash");
  const tb = useTranslations("Booking");
  const locale = useLocale();
  const [status, setStatus] = useState<"" | BookingStatus>("");
  const [page, setPage] = useState(0);
  const list = useDash<Page<Booking>>(`/api/admin/bookings${toQuery({ status, page, size: 20 })}`);
  const all: ("" | BookingStatus)[] = ["", "REQUESTED", "ACCEPTED", "COMPLETED", "DECLINED", "CANCELLED"];
  return (
    <>
      <PageHead title={t("allBookings")} />
      <div className="mb-6">
        <Chips
          label={t("status")}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
          options={all.map((v) => ({ v, label: v ? tb(`status_${v}`) : t("filterAll") }))}
        />
      </div>
      <Card>
        {!list.data ? (
          <Spinner />
        ) : list.data.content.length === 0 ? (
          <Empty>—</Empty>
        ) : (
          <Table head={["#", t("listing"), t("renter"), t("host"), t("dates"), t("amount"), t("status")]} minWidth={1000}>
            {list.data.content.map((b) => (
              <tr key={b.id}>
                <td className="num text-ash">{b.id}</td>
                <td className="max-w-[240px]">
                  <Link href={`/listing/${b.listing.id}`} className="block truncate text-ivory hover:underline">
                    {b.listing.title}
                  </Link>
                </td>
                <td className="whitespace-nowrap">{b.renter.name}</td>
                <td className="whitespace-nowrap">{b.host.name}</td>
                <td className="num whitespace-nowrap text-ash">{fmtRange(b.startDate, b.endDate, locale)}</td>
                <td className="num whitespace-nowrap">{money(b.rentalTotal, locale)}</td>
                <td>
                  <Pill tone={BOOKING_TONE[b.status]}>{tb(`status_${b.status}`)}</Pill>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {list.data && <Pager page={list.data.page} totalPages={list.data.totalPages} onPage={setPage} tone="dark" />}
      </Card>
    </>
  );
}

type CatForm = { id?: number; slug: string; nameAz: string; nameEn: string; icon: string; sortOrder: number; active: boolean };
const ICONS = ["camera", "drill", "tent", "bike", "gamepad", "speaker", "shirt", "music", "wave", "baby", "tag", "sparkle"];

export function AdminCategories() {
  const t = useTranslations("Dash");
  const tc = useTranslations("Common");
  const list = useDash<Category[]>("/api/admin/categories");
  const mutate = useMutate(list.reload);
  const [edit, setEdit] = useState<CatForm | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const { id, ...body } = edit;
    const ok = await mutate(id ? `/api/admin/categories/${id}` : "/api/admin/categories", id ? "PUT" : "POST", body);
    if (ok) setEdit(null);
  };

  const label = "mb-2 block text-[14px] text-ash";
  return (
    <>
      <PageHead
        title={t("categories")}
        action={
          <DButton variant="primary" onClick={() => setEdit({ slug: "", nameAz: "", nameEn: "", icon: "tag", sortOrder: (list.data?.length ?? 0) + 1, active: true })}>
            <Icon name="plus" size={18} /> {t("addCategory")}
          </DButton>
        }
      />
      <Card>
        {!list.data ? (
          <Spinner />
        ) : (
          <Table head={[t("icon"), t("nameAz"), t("nameEn"), t("slug"), t("allListings"), t("order"), t("status"), ""]} minWidth={900}>
            {list.data.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="flex size-9 items-center justify-center rounded-full bg-obsidian">
                    <Icon name={c.icon} size={18} />
                  </span>
                </td>
                <td>{c.nameAz}</td>
                <td>{c.nameEn}</td>
                <td className="font-mono text-[13px] text-ash">{c.slug}</td>
                <td className="num">{c.listingCount}</td>
                <td className="num">{c.sortOrder}</td>
                <td>
                  <Pill tone={c.active ? "good" : "neutral"}>{c.active ? t("active") : t("status_HIDDEN")}</Pill>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <DButton variant="quiet" onClick={() => setEdit({ ...c })} aria-label={`${tc("edit")}: ${c.nameAz}`}>
                      {tc("edit")}
                    </DButton>
                    <DButton variant="quiet" onClick={() => window.confirm(`${tc("delete")}: ${c.nameAz}?`) && mutate(`/api/admin/categories/${c.id}`, "DELETE")} aria-label={`${tc("delete")}: ${c.nameAz}`}>
                      <Icon name="trash" size={16} />
                    </DButton>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? tc("edit") : t("addCategory")} tone="dark">
        {edit && (
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="c-az" className={label}>
                  {t("nameAz")}
                </label>
                <input id="c-az" required maxLength={80} className="dash-input" value={edit.nameAz} onChange={(e) => setEdit({ ...edit, nameAz: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-en" className={label}>
                  {t("nameEn")}
                </label>
                <input id="c-en" required maxLength={80} className="dash-input" value={edit.nameEn} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-slug" className={label}>
                  {t("slug")}
                </label>
                <input id="c-slug" required pattern="[a-z0-9-]{2,60}" className="dash-input font-mono" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value.toLowerCase() })} />
              </div>
              <div>
                <label htmlFor="c-order" className={label}>
                  {t("order")}
                </label>
                <input id="c-order" type="number" min={0} className="dash-input num" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <fieldset>
              <legend className={label}>{t("icon")}</legend>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((i) => (
                  <label key={i} className="cursor-pointer">
                    <input type="radio" name="icon" value={i} checked={edit.icon === i} onChange={() => setEdit({ ...edit, icon: i })} className="peer sr-only" />
                    <span className="flex size-11 items-center justify-center rounded-full border border-slate-line peer-checked:border-ivory peer-checked:bg-obsidian peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt-soft">
                      <Icon name={i} size={18} />
                    </span>
                    <span className="sr-only">{i}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex min-h-11 items-center gap-3 text-[15px]">
              <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} className="size-5 accent-[#5266eb]" />
              {t("active")}
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <DButton type="button" variant="quiet" onClick={() => setEdit(null)}>
                {tc("cancel")}
              </DButton>
              <DButton type="submit" variant="primary">
                {tc("save")}
              </DButton>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export function AdminReports() {
  const t = useTranslations("Dash");
  const locale = useLocale();
  const [status, setStatus] = useState<"" | ReportStatus>("OPEN");
  const list = useDash<Report[]>(`/api/admin/reports${toQuery({ status })}`);
  const mutate = useMutate(list.reload);
  return (
    <>
      <PageHead title={t("reports")} />
      <div className="mb-6">
        <Chips
          label={t("status")}
          value={status}
          onChange={setStatus}
          options={(["OPEN", "RESOLVED", "DISMISSED", ""] as const).map((v) => ({ v, label: v ? t(`report_${v}`) : t("filterAll") }))}
        />
      </div>
      {!list.data ? (
        <Spinner />
      ) : list.data.length === 0 ? (
        <Empty>—</Empty>
      ) : (
        <ul className="space-y-3">
          {list.data.map((r) => (
            <li key={r.id} className="rounded-[12px] bg-graphite p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={r.status === "OPEN" ? "warn" : r.status === "RESOLVED" ? "good" : "neutral"}>{t(`report_${r.status}`)}</Pill>
                    <span className="num text-[12px] text-ash">{fmtDate(r.createdAt, locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <Link href={`/listing/${r.listing.id}`} className="mt-3 block truncate text-[16px] font-[480] hover:underline">
                    {r.listing.title}
                  </Link>
                  <p className="mt-1 text-[15px]">“{r.reason}”</p>
                  <p className="mt-2 text-[13px] text-ash">
                    {t("reporter")}: {r.reporter.name} · {t("status")}: {t(`status_${r.listing.status}`)}
                  </p>
                </div>
                {r.status === "OPEN" && (
                  <div className="flex flex-wrap gap-2">
                    {r.listing.status === "ACTIVE" && (
                      <DButton variant="danger" onClick={() => mutate(`/api/admin/listings/${r.listing.id}`, "PATCH", { status: "HIDDEN" })}>
                        <Icon name="eyeOff" size={16} /> {t("hide")}
                      </DButton>
                    )}
                    <DButton variant="ghost" onClick={() => mutate(`/api/admin/reports/${r.id}`, "PATCH", { status: "RESOLVED" })}>
                      <Icon name="check" size={16} /> {t("resolve")}
                    </DButton>
                    <DButton variant="quiet" onClick={() => mutate(`/api/admin/reports/${r.id}`, "PATCH", { status: "DISMISSED" })}>
                      {t("dismiss")}
                    </DButton>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
