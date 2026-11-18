"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { catName, CITIES, fmtRange } from "@/lib/format";
import type { Block, Category, Condition, ListingDetail, ListingInput, Photo as PhotoT } from "@/lib/types";
import { DateRangePicker } from "../date-range-picker";
import { Icon } from "../icons";
import { useApiErrorToast, useToast } from "../providers";
import { Photo, Spinner } from "../ui";
import { Card, DButton, PageHead } from "./kit";

const CONDITIONS: Condition[] = ["NEW", "LIKE_NEW", "GOOD", "FAIR"];
const EMPTY: ListingInput = { title: "", description: "", categoryId: 0, city: "Bakı", district: "", dailyPrice: 10, deposit: 50, condition: "GOOD", minDays: 1, maxDays: 14 };

export function ListingEditor({ id }: { id?: number }) {
  const t = useTranslations("Dash");
  const tl = useTranslations("Listing");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState<ListingInput>(EMPTY);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    api<Category[]>("/api/categories", { auth: false })
      .then((cs) => {
        setCats(cs);
        setForm((f) => (f.categoryId ? f : { ...f, categoryId: cs[0]?.id ?? 0 }));
      })
      .catch(onError);
  }, [onError]);

  useEffect(() => {
    if (!id) return;
    api<ListingDetail>(`/api/listings/${id}`)
      .then((l) => {
        setListing(l);
        setForm({ title: l.title, description: l.description, categoryId: l.category.id, city: l.city, district: l.district ?? "", dailyPrice: l.dailyPrice, deposit: l.deposit, condition: l.condition, minDays: l.minDays, maxDays: l.maxDays });
      })
      .catch(onError)
      .finally(() => setLoading(false));
  }, [id, onError]);

  const set = <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = { ...form, district: form.district?.trim() || null, title: form.title.trim(), description: form.description.trim() };
    try {
      if (id) {
        const l = await api<ListingDetail>(`/api/listings/${id}`, { method: "PUT", body });
        setListing(l);
        toast(t("updated"));
      } else {
        const l = await api<ListingDetail>("/api/listings", { method: "POST", body });
        toast(t("created"));
        router.replace(`/host/listings/${l.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else onError(err);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-ash">
        <Spinner />
      </div>
    );
  }

  const label = "mb-2 block text-[14px] text-ash";
  const err = (k: string) =>
    errors[k] ? (
      <p id={`err-${k}`} className="mt-1.5 text-[13px] text-[#f0b5bf]">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `err-${k}` } : {});

  return (
    <>
      <div className="mb-4">
        <Link href="/host/listings" className="inline-flex min-h-11 items-center gap-2 text-[14px] text-ash hover:text-ivory">
          <Icon name="chevronLeft" size={16} /> {t("listings")}
        </Link>
      </div>
      <PageHead
        title={id ? t("formTitleEdit") : t("formTitleNew")}
        sub={listing?.title}
        action={
          listing && (
            <Link href={`/listing/${listing.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-[32px] border border-ivory/80 px-5 text-[15px] hover:bg-obsidian">
              {t("view")} <Icon name="arrowRight" size={16} />
            </Link>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <form onSubmit={save} className="space-y-6">
            <div>
              <label htmlFor="l-title" className={label}>
                {t("fTitle")}
              </label>
              <input id="l-title" required minLength={4} maxLength={140} className="dash-input" placeholder={t("fTitleHint")} value={form.title} onChange={(e) => set("title", e.target.value)} {...aria("title")} />
              {err("title")}
            </div>
            <div>
              <label htmlFor="l-desc" className={label}>
                {t("fDescription")}
              </label>
              <textarea id="l-desc" required minLength={20} maxLength={4000} rows={6} className="dash-input" placeholder={t("fDescriptionHint")} value={form.description} onChange={(e) => set("description", e.target.value)} {...aria("description")} />
              {err("description")}
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="l-cat" className={label}>
                  {t("fCategory")}
                </label>
                <select id="l-cat" className="dash-input" value={form.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {catName(c, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="l-cond" className={label}>
                  {t("fCondition")}
                </label>
                <select id="l-cond" className="dash-input" value={form.condition} onChange={(e) => set("condition", e.target.value as Condition)}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {tl(`condition_${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="l-city" className={label}>
                  {t("fCity")}
                </label>
                <select id="l-city" className="dash-input" value={form.city} onChange={(e) => set("city", e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="l-district" className={label}>
                  {t("fDistrict")}
                </label>
                <input id="l-district" maxLength={80} className="dash-input" value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} />
              </div>
              <div>
                <label htmlFor="l-price" className={label}>
                  {t("fPrice")}
                </label>
                <input id="l-price" type="number" required min={1} max={10000} step="0.5" inputMode="decimal" className="dash-input num" value={form.dailyPrice} onChange={(e) => set("dailyPrice", Number(e.target.value))} {...aria("dailyPrice")} />
                {err("dailyPrice")}
              </div>
              <div>
                <label htmlFor="l-deposit" className={label}>
                  {t("fDeposit")}
                </label>
                <input id="l-deposit" type="number" required min={0} max={100000} step="1" inputMode="decimal" className="dash-input num" value={form.deposit} onChange={(e) => set("deposit", Number(e.target.value))} {...aria("deposit")} />
                {err("deposit")}
              </div>
              <div>
                <label htmlFor="l-min" className={label}>
                  {t("fMinDays")}
                </label>
                <input id="l-min" type="number" required min={1} max={90} className="dash-input num" value={form.minDays} onChange={(e) => set("minDays", Number(e.target.value))} {...aria("minDays")} />
                {err("minDays")}
              </div>
              <div>
                <label htmlFor="l-max" className={label}>
                  {t("fMaxDays")}
                </label>
                <input id="l-max" type="number" required min={form.minDays} max={90} className="dash-input num" value={form.maxDays} onChange={(e) => set("maxDays", Number(e.target.value))} {...aria("maxDays")} />
                {err("maxDays")}
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-line pt-6">
              <DButton type="submit" variant="primary" disabled={busy || !form.categoryId}>
                {busy && <Spinner className="size-4" />}
                {id ? tc("save") : t("newListing")}
              </DButton>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          {listing ? (
            <>
              <PhotosCard listing={listing} onChange={(photos) => setListing({ ...listing, photos, coverUrl: photos[0]?.url ?? null })} />
              <CalendarCard listing={listing} />
            </>
          ) : (
            <Card>
              <p className="flex items-start gap-3 text-ash">
                <Icon name="camera" size={20} className="mt-0.5 shrink-0" /> {t("saveFirst")}
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function PhotosCard({ listing, onChange }: { listing: ListingDetail; onChange: (p: PhotoT[]) => void }) {
  const t = useTranslations("Dash");
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append("files", f));
    setBusy(true);
    try {
      const photos = await api<PhotoT[]>(`/api/listings/${listing.id}/photos`, { method: "POST", body: fd, timeoutMs: 60000 });
      onChange(photos);
      toast(t("uploaded"));
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (p: PhotoT) => {
    try {
      await api(`/api/listings/${listing.id}/photos/${p.id}`, { method: "DELETE" });
      onChange(listing.photos.filter((x) => x.id !== p.id));
    } catch (e) {
      onError(e);
    }
  };

  return (
    <Card title={t("photosTitle")} sub={t("photosHint")}>
      <ul className="grid grid-cols-3 gap-2">
        {listing.photos.map((p, i) => (
          <li key={p.id} className="group relative aspect-square overflow-hidden rounded-[8px] bg-obsidian">
            <Photo src={p.url} alt={`${listing.title} ${i + 1}`} fill sizes="160px" className="object-cover" />
            <button
              type="button"
              onClick={() => remove(p)}
              aria-label={`${t("removePhoto")} ${i + 1}`}
              className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-full bg-onyx/80 text-ivory opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <input ref={input} id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={busy || listing.photos.length >= 8} />
      <label
        htmlFor="photo-input"
        className={`mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[32px] border border-dashed border-ivory/60 px-5 text-[15px] hover:bg-obsidian ${listing.photos.length >= 8 ? "pointer-events-none opacity-40" : ""}`}
      >
        {busy ? <Spinner className="size-4" /> : <Icon name="upload" size={18} />}
        {busy ? t("uploading") : t("upload")}
      </label>
    </Card>
  );
}

function CalendarCard({ listing }: { listing: ListingDetail }) {
  const t = useTranslations("Dash");
  const locale = useLocale();
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [booked, setBooked] = useState(listing.unavailable.filter((u) => u.kind === "BOOKED"));
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [note, setNote] = useState("");

  const reload = () => {
    api<Block[]>(`/api/listings/${listing.id}/blocks`).then(setBlocks).catch(onError);
    api<ListingDetail>(`/api/listings/${listing.id}`)
      .then((l) => setBooked(l.unavailable.filter((u) => u.kind === "BOOKED")))
      .catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [listing.id]);

  const block = async () => {
    if (!range.from) return;
    try {
      await api(`/api/listings/${listing.id}/blocks`, { method: "POST", body: { from: range.from, to: range.to ?? range.from, note: note.trim() || undefined } });
      toast(t("blocked"));
      setRange({ from: null, to: null });
      setNote("");
      reload();
    } catch (e) {
      onError(e);
    }
  };
  const unblock = async (b: Block) => {
    try {
      await api(`/api/listings/${listing.id}/blocks/${b.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      onError(e);
    }
  };

  const unavailable = [...booked, ...blocks.map((b) => ({ from: b.from, to: b.to, kind: "BLOCKED" as const }))];

  return (
    <Card title={t("calendarTitle")} sub={t("calendarHint")}>
      <DateRangePicker value={range} onChange={setRange} unavailable={unavailable} tone="dark" showKinds />
      <ul className="mt-4 flex flex-wrap gap-4 text-[12px] text-ash" aria-label="Legend">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#3b3f6b]" /> {t("legendBooked")}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-obsidian ring-1 ring-slate-line" /> {t("legendBlocked")}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full ring-1 ring-ivory" /> {t("legendFree")}
        </li>
      </ul>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="block-note" className="sr-only">
          {t("blockNote")}
        </label>
        <input id="block-note" className="dash-input" placeholder={t("blockNote")} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        <DButton variant="ghost" disabled={!range.from} onClick={block} className="shrink-0">
          {t("blockDates")}
        </DButton>
      </div>
      {blocks.length > 0 && (
        <ul className="mt-5 divide-y divide-slate-line/60 border-t border-slate-line/60">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-[14px]">
              <span className="num">
                {fmtRange(b.from, b.to, locale)}
                {b.note && <span className="text-ash"> · {b.note}</span>}
              </span>
              <DButton variant="quiet" onClick={() => unblock(b)}>
                {t("unblock")}
              </DButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
