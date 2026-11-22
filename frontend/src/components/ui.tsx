"use client";

import Image, { type ImageProps } from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { API_CONFIGURED } from "@/lib/api";
import { initials } from "@/lib/format";
import { Icon } from "./icons";
import { useDemoMode } from "./providers";

const OPTIMIZABLE = /^https:\/\/(thumb|upload)\.wikimedia\.org\//;

/** next/image for seed photos; uploads from the API (any host, incl. localhost in dev) bypass the optimiser. */
export function Photo({ src, alt, ...rest }: Omit<ImageProps, "src"> & { src: string | null | undefined }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-[#e7e5e4] text-[#8a8583] ${rest.fill ? "absolute inset-0" : ""} ${rest.className ?? ""}`}
      >
        <Icon name="camera" size={28} />
      </span>
    );
  }
  return <Image src={src} alt={alt} unoptimized={!OPTIMIZABLE.test(src)} onError={() => setBroken(true)} {...rest} />;
}

export function Wordmark({ zone = "discovery", className = "", size }: { zone?: "discovery" | "market" | "dashboard"; className?: string; size?: number }) {
  const dot = zone === "discovery" ? "bg-violet" : zone === "market" ? "bg-coral" : "bg-cobalt";
  return (
    <span className={`inline-flex items-baseline font-semibold ${className}`} style={{ fontSize: size, letterSpacing: "-0.055em" }} translate="no">
      share
      <span aria-hidden="true" className={`ml-[0.08em] inline-block size-[0.24em] rounded-full ${dot}`} />
    </span>
  );
}

export function Avatar({ name, src, size = 40, className = "" }: { name: string; src?: string | null; size?: number; className?: string }) {
  if (src) {
    return <Photo src={src} alt="" width={size} height={size} className={`rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#222] font-medium text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function Stars({ value, count, size = 14, className = "" }: { value: number; count?: number; size?: number; className?: string }) {
  const t = useTranslations("Common");
  if (!count) return <span className={`text-[14px] ${className}`}>{t("new")}</span>;
  return (
    <span className={`inline-flex items-center gap-1 num ${className}`}>
      <Icon name="star" size={size} fill="currentColor" strokeWidth={0} />
      <span>{value.toFixed(2).replace(/0$/, "")}</span>
      <span className="sr-only">/ 5,</span>
      <span className="opacity-70">({t("reviews", { count })})</span>
    </span>
  );
}

export function DemoBanner({ tone = "light", force = false }: { tone?: "light" | "dark"; force?: boolean }) {
  const { demo } = useDemoMode();
  const t = useTranslations("Common");
  if (!demo && !force) return null;
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 px-4 py-2.5 text-center text-[14px] ${
        tone === "dark" ? "bg-obsidian text-ivory" : "bg-[#fff6e5] text-[#5c3b00]"
      }`}
    >
      {API_CONFIGURED && <span aria-hidden="true" className="inline-block size-2 animate-pulse rounded-full bg-current" />}
      {API_CONFIGURED ? t("demoMode") : t("demoOffline")}
    </div>
  );
}

export function LangSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Common");
  const other = locale === "az" ? "en" : "az";
  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      aria-label={t("langLabel")}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium ${className}`}
    >
      <Icon name="globe" size={18} />
      <span lang={other}>{other.toUpperCase()}</span>
    </Link>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />;
}

export function Pager({ page, totalPages, onPage, tone = "light" }: { page: number; totalPages: number; onPage: (p: number) => void; tone?: "light" | "dark" }) {
  const t = useTranslations("Common");
  if (totalPages <= 1) return null;
  const btn =
    tone === "dark"
      ? "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-line text-ivory disabled:opacity-35"
      : "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#b0b0b0] text-hof disabled:opacity-35";
  return (
    <nav aria-label={t("page", { page: page + 1, total: totalPages })} className="mt-10 flex items-center justify-center gap-3">
      <button type="button" className={btn} disabled={page === 0} onClick={() => onPage(page - 1)} aria-label={t("prev")}>
        <Icon name="chevronLeft" />
      </button>
      <span className={`num text-[14px] ${tone === "dark" ? "text-ash" : "text-foggy"}`}>{t("page", { page: page + 1, total: totalPages })}</span>
      <button type="button" className={btn} disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)} aria-label={t("next")}>
        <Icon name="chevronRight" />
      </button>
    </nav>
  );
}
