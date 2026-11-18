"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { CITIES, fmtDate } from "@/lib/format";
import type { ListingCard as Card, User } from "@/lib/types";
import { useRequireAuth } from "@/lib/use-require-auth";
import { Icon } from "../icons";
import { ListingCard } from "../market/listing-card";
import { useApiErrorToast, useAuth, useToast, useWishlist } from "../providers";
import { Avatar, Spinner } from "../ui";

export function Wishlist() {
  const t = useTranslations("Wishlist");
  const { allowed } = useRequireAuth();
  const { ids } = useWishlist();
  const [items, setItems] = useState<Card[] | null>(null);

  useEffect(() => {
    if (!allowed) return;
    api<Card[]>("/api/wishlist").then(setItems).catch(() => setItems([]));
  }, [allowed]);

  if (!allowed || !items) return <div className="flex justify-center py-24"><Spinner /></div>;
  // un-hearting on this page removes the card immediately
  const visible = items.filter((l) => ids.has(l.id));

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">{t("title")}</h1>
      {visible.length === 0 ? (
        <div className="mt-8 max-w-xl">
          <p className="text-foggy">{t("empty")}</p>
          <Link href="/search" className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-hof px-6 font-medium text-white">
            {t("explore")}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((l) => (
            <li key={l.id}>
              <ListingCard l={l} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Profile() {
  const t = useTranslations("Profile");
  const tn = useTranslations("Nav");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { allowed, user } = useRequireAuth();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const [form, setForm] = useState({ name: "", city: "", bio: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name, city: user.city ?? "", bio: user.bio ?? "" });
  }, [user]);

  if (!allowed || !user) return <div className="flex justify-center py-24"><Spinner /></div>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await api<User>("/api/users/me", { method: "PUT", body: { name: form.name.trim(), city: form.city || null, bio: form.bio.trim() || null } });
      setUser(u);
      toast(t("saved"));
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  const quick = [
    { href: "/trips", label: tn("trips"), icon: "calendar" },
    { href: "/wishlist", label: tn("wishlist"), icon: "heart" },
    { href: "/messages", label: tn("messages"), icon: "message" },
    { href: "/host", label: tn("hostDashboard"), icon: "chart" },
    ...(user.role === "ADMIN" ? [{ href: "/admin", label: tn("admin"), icon: "shield" }] : []),
  ];

  return (
    <div className="mx-auto grid max-w-[1040px] gap-12 px-4 py-10 sm:px-6 md:grid-cols-[320px_1fr]">
      <aside>
        <div className="flex flex-col items-center rounded-[20px] p-8 text-center shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <Avatar name={user.name} src={user.avatarUrl} size={104} />
          <p className="mt-4 text-[24px] font-semibold leading-tight">{user.name}</p>
          <p className="text-[14px] text-foggy">{t(`role_${user.role}`)}</p>
          <p className="mt-3 text-[14px] text-foggy">{t("member", { date: fmtDate(user.joinedAt, locale, { month: "long", year: "numeric" }) })}</p>
        </div>
        <h2 className="mb-2 mt-8 text-[16px] font-semibold">{t("quick")}</h2>
        <ul>
          {quick.map((q) => (
            <li key={q.href}>
              <Link href={q.href} className="flex min-h-12 items-center gap-3 border-b border-hair text-[15px] hover:underline">
                <Icon name={q.icon} size={20} />
                {q.label}
                <Icon name="chevronRight" size={16} className="ml-auto text-foggy" />
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <form onSubmit={save} className="max-w-xl space-y-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{t("title")}</h1>
        <div>
          <label htmlFor="p-name" className="mb-1.5 block text-[14px] font-medium">
            {t("name")}
          </label>
          <input id="p-name" required minLength={2} maxLength={80} className="market-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="p-email" className="mb-1.5 block text-[14px] font-medium">
            {t("email")}
          </label>
          <input id="p-email" className="market-input bg-faint text-foggy" value={user.email} readOnly />
        </div>
        <div>
          <label htmlFor="p-city" className="mb-1.5 block text-[14px] font-medium">
            {t("city")}
          </label>
          <select id="p-city" className="market-input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
            <option value="">—</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-bio" className="mb-1.5 block text-[14px] font-medium">
            {t("bio")}
          </label>
          <textarea id="p-bio" maxLength={600} className="market-input" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>
        <button type="submit" disabled={busy} className="min-h-12 rounded-lg bg-hof px-8 font-medium text-white disabled:opacity-60">
          {tc("save")}
        </button>
      </form>
    </div>
  );
}
