"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { api, toQuery } from "@/lib/api";
import { demoCategories, demoSearch } from "@/lib/demo";
import { catName, CITIES, today } from "@/lib/format";
import type { Category, ListingCard as Card, Page, SearchParams } from "@/lib/types";
import { useResilient } from "@/lib/use-resilient";
import { Icon } from "../icons";
import { Pager } from "../ui";
import { CardSkeleton, ListingCard } from "./listing-card";

const SORTS = ["newest", "price_asc", "price_desc", "rating"] as const;

function readParams(sp: URLSearchParams, fixedCategory?: string): SearchParams {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return {
    q: sp.get("q") ?? undefined,
    category: fixedCategory ?? sp.get("category") ?? undefined,
    city: sp.get("city") ?? undefined,
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    sort: (SORTS as readonly string[]).includes(sp.get("sort") ?? "") ? (sp.get("sort") as SearchParams["sort"]) : undefined,
    page: num("page"),
    size: 12,
  };
}

function Filters({ params, categories, fixedCategory, onApply, idPrefix }: { params: SearchParams; categories: Category[]; fixedCategory?: string; onApply: (p: SearchParams) => void; idPrefix: string }) {
  const t = useTranslations("Search");
  const tc = useTranslations("Common");
  const locale = useLocale();
  // remounted (key = query string) whenever the applied params change, so the draft always starts from them
  const [draft, setDraft] = useState(params);
  const set = (k: keyof SearchParams, v: string) => setDraft((d) => ({ ...d, [k]: v === "" ? undefined : k === "minPrice" || k === "maxPrice" ? Number(v) : v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply({ ...draft, page: 0 });
  };
  const label = "mb-1.5 block text-[14px] font-medium";
  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor={`${idPrefix}-q`} className={label}>
          {t("q")}
        </label>
        <input id={`${idPrefix}-q`} className="market-input" value={draft.q ?? ""} onChange={(e) => set("q", e.target.value)} />
      </div>
      {!fixedCategory && (
        <div>
          <label htmlFor={`${idPrefix}-cat`} className={label}>
            {t("category")}
          </label>
          <select id={`${idPrefix}-cat`} className="market-input" value={draft.category ?? ""} onChange={(e) => set("category", e.target.value)}>
            <option value="">{tc("all")}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {catName(c, locale)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor={`${idPrefix}-city`} className={label}>
          {tc("city")}
        </label>
        <select id={`${idPrefix}-city`} className="market-input" value={draft.city ?? ""} onChange={(e) => set("city", e.target.value)}>
          <option value="">{tc("anyCity")}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className={label}>{t("price")}</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${idPrefix}-min`} className="mb-1 block text-[12px] text-foggy">
              {t("min")}
            </label>
            <input id={`${idPrefix}-min`} type="number" inputMode="numeric" min={0} className="market-input num" value={draft.minPrice ?? ""} onChange={(e) => set("minPrice", e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-max`} className="mb-1 block text-[12px] text-foggy">
              {t("max")}
            </label>
            <input id={`${idPrefix}-max`} type="number" inputMode="numeric" min={0} className="market-input num" value={draft.maxPrice ?? ""} onChange={(e) => set("maxPrice", e.target.value)} />
          </div>
        </div>
      </fieldset>
      <fieldset>
        <legend className={label}>{t("dates")}</legend>
        <div className="grid gap-3">
          <div>
            <label htmlFor={`${idPrefix}-from`} className="mb-1 block text-[12px] text-foggy">
              {tc("from")}
            </label>
            <input id={`${idPrefix}-from`} type="date" min={today()} className="market-input text-[15px]" value={draft.from ?? ""} onChange={(e) => set("from", e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-to`} className="mb-1 block text-[12px] text-foggy">
              {tc("to")}
            </label>
            <input id={`${idPrefix}-to`} type="date" min={draft.from ?? today()} className="market-input text-[15px]" value={draft.to ?? ""} onChange={(e) => set("to", e.target.value)} />
          </div>
        </div>
      </fieldset>
      <div className="flex items-center justify-between gap-3 border-t border-hair pt-5">
        <button
          type="button"
          className="min-h-11 rounded-lg px-2 text-[15px] font-medium underline underline-offset-2"
          onClick={() => onApply({ category: fixedCategory, page: 0, sort: params.sort })}
        >
          {t("clear")}
        </button>
        <button type="submit" className="min-h-12 whitespace-nowrap rounded-lg bg-hof px-5 text-[15px] font-medium text-white">
          {t("showResults")}
        </button>
      </div>
    </form>
  );
}

export function ResultsView({ fixedCategory, heading }: { fixedCategory?: string; heading?: string }) {
  const t = useTranslations("Search");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const spKey = sp.toString();
  const params = useMemo(() => readParams(new URLSearchParams(spKey), fixedCategory), [spKey, fixedCategory]);
  const [drawer, setDrawer] = useState(false);
  const drawerId = useId();

  const cats = useResilient<Category[]>("cats", () => api<Category[]>("/api/categories", { auth: false }), () => demoCategories);
  const key = `/api/listings${toQuery({ ...params })}`;
  const res = useResilient<Page<Card>>(key, () => api<Page<Card>>(key, { auth: false }), () => demoSearch(params));

  const apply = (p: SearchParams) => {
    const { category, size: _size, ...rest } = p;
    void _size;
    const query = toQuery({ ...rest, ...(fixedCategory ? {} : { category }), page: p.page ? p.page : undefined });
    router.replace(`${pathname}${query}`, { scroll: false });
    setDrawer(false);
  };

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const categories = cats.data ?? [];
  const activeFilters = [params.q, params.city, params.minPrice, params.maxPrice, params.from].filter((x) => x !== undefined).length;
  const title = heading ?? (params.q ? t("resultsFor", { q: params.q }) : t("allItems"));

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
      {/* category tabs: icon above label, active = 2px black underline */}
      <nav aria-label={t("category")} className="-mx-4 overflow-x-auto border-b border-hair px-4 scrollbar-none sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <ul className="flex w-max gap-7 pt-4">
          {categories.map((c) => {
            const active = params.category === c.slug;
            return (
              <li key={c.slug}>
                <Link
                  href={`/c/${c.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 min-w-11 flex-col items-center gap-1.5 border-b-2 pb-3 text-[12px] font-medium transition-colors ${
                    active ? "border-hof text-hof" : "border-transparent text-foggy hover:border-deco hover:text-hof"
                  }`}
                >
                  <Icon name={c.icon} size={24} strokeWidth={1.5} />
                  {catName(c, locale)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-8">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[28px]">{title}</h1>
          <p className="num mt-1 text-[14px] text-foggy" aria-live="polite">
            {res.data ? t("count", { count: res.data.totalElements }) : tc("loading")}
            {params.city ? ` · ${t("inCity", { city: params.city })}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-expanded={drawer}
            aria-controls={drawerId}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b0b0b0] px-4 text-[14px] font-medium lg:hidden"
          >
            <Icon name="sliders" size={18} />
            {t("filters")}
            {activeFilters > 0 && <span className="num flex size-5 items-center justify-center rounded-full bg-hof text-[11px] text-white">{activeFilters}</span>}
          </button>
          <label htmlFor="sort" className="sr-only">
            {t("sort")}
          </label>
          <select
            id="sort"
            value={params.sort ?? "newest"}
            onChange={(e) => apply({ ...params, sort: e.target.value as SearchParams["sort"], page: 0 })}
            className="min-h-11 rounded-full border border-[#b0b0b0] bg-white px-4 text-[14px] font-medium"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`sort_${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label={t("filters")}>
          <div className="sticky top-28 rounded-card border border-hair p-5">
            <h2 className="mb-5 text-[16px] font-semibold">{t("filters")}</h2>
            <Filters key={spKey} params={params} categories={categories} fixedCategory={fixedCategory} onApply={apply} idPrefix="side" />
          </div>
        </aside>

        <section aria-label={title}>
          {res.error ? (
            <p role="alert" className="rounded-card bg-faint p-8 text-center">
              {tc("error")}
            </p>
          ) : !res.data ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : res.data.content.length === 0 ? (
            <div className="rounded-card bg-faint px-6 py-16 text-center">
              <Icon name="search" size={32} className="mx-auto text-foggy" />
              <h2 className="mt-4 text-[20px] font-semibold">{t("emptyTitle")}</h2>
              <p className="mt-2 text-foggy">{t("emptyText")}</p>
              <button type="button" onClick={() => apply({ category: fixedCategory, page: 0 })} className="mt-6 min-h-11 rounded-lg border border-hof px-5 text-[14px] font-medium hover:bg-white">
                {t("clear")}
              </button>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-10 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {res.data.content.map((l, i) => (
                  <li key={l.id}>
                    <ListingCard l={l} priority={i < 3} />
                  </li>
                ))}
              </ul>
              <Pager page={res.data.page} totalPages={res.data.totalPages} onPage={(p) => apply({ ...params, page: p })} />
            </>
          )}
        </section>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby={`${drawerId}-t`} id={drawerId}>
          <button type="button" aria-label={tc("close")} className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] animate-zone-in overflow-y-auto rounded-t-[20px] bg-white p-5 pb-8 shadow-[var(--shadow-overlay)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 id={`${drawerId}-t`} className="text-[18px] font-semibold">
                {t("filters")}
              </h2>
              <button type="button" onClick={() => setDrawer(false)} aria-label={tc("close")} className="flex size-11 items-center justify-center rounded-full hover:bg-faint">
                <Icon name="x" />
              </button>
            </div>
            <Filters key={spKey} params={params} categories={categories} fixedCategory={fixedCategory} onApply={apply} idPrefix="drawer" />
          </div>
        </div>
      )}
    </div>
  );
}
