"use client";

import { useTranslations } from "next-intl";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-[16px] text-ash">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, sub, children, className = "", action }: { title?: string; sub?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-[12px] bg-graphite p-6 sm:p-8 ${className}`} aria-label={title}>
      {(title || action) && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[18px] font-[480] tracking-[0.01em]">{title}</h2>}
            {sub && <p className="mt-1 text-[14px] text-ash">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-graphite p-4 sm:p-6">
      <p className="text-[14px] tracking-[0.005em] text-ash">{label}</p>
      <p className="num mt-3 text-[24px] font-[480] leading-none tracking-[0.015em] sm:text-[28px]">{value}</p>
      {hint && <p className="mt-2 text-[12px] text-ash">{hint}</p>}
    </div>
  );
}

type Variant = "primary" | "ghost" | "quiet" | "danger";
export function DButton({ variant = "ghost", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const v = {
    primary: "bg-cobalt text-white hover:bg-[#4458dd]",
    ghost: "border border-ivory/80 text-ivory hover:bg-obsidian",
    quiet: "text-ash hover:bg-obsidian hover:text-ivory",
    danger: "border border-[#e7a3ad]/60 text-[#f3c3ca] hover:bg-[#3a1d25]",
  }[variant];
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[32px] px-5 text-[15px] transition-colors disabled:opacity-40 ${v} ${className}`} {...rest} />;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const c = {
    neutral: "border-slate-line text-ash",
    good: "border-[#4f8f6b] text-[#a8dcbc]",
    warn: "border-[#9a7a3c] text-[#ecd29a]",
    bad: "border-[#8f4f5a] text-[#f0b5bf]",
    info: "border-[#5b67b8] text-[#c2c9ff]",
  }[tone];
  return <span className={`inline-flex whitespace-nowrap rounded-[40px] border px-2.5 py-0.5 text-[12px] tracking-[0.01em] ${c}`}>{children}</span>;
}

export const BOOKING_TONE = { REQUESTED: "warn", ACCEPTED: "good", DECLINED: "neutral", CANCELLED: "neutral", COMPLETED: "info" } as const;

/** Wide admin tables scroll inside their card, never the page. */
export function Table({ head, children, minWidth = 720 }: { head: string[]; children: ReactNode; minWidth?: number }) {
  const t = useTranslations("Dash");
  return (
    <div className="dash-scroll -mx-6 sm:-mx-8" role="region" aria-label={t("tableScroll")} tabIndex={0}>
      <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-slate-line text-[12px] tracking-[0.01em] text-ash">
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-6 pb-3 font-normal first:pl-6 sm:first:pl-8 last:pr-6 sm:last:pr-8">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-slate-line/60 [&>tr:last-child]:border-0 [&_td]:px-6 [&_td]:py-3.5 [&_td:first-child]:pl-6 sm:[&_td:first-child]:pl-8 [&_td:last-child]:pr-6 sm:[&_td:last-child]:pr-8">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/** Minimal SVG bar chart; the numbers are also in a visually hidden table for screen readers. */
export function BarChart({ data, format, label }: { data: { label: string; value: number }[]; format: (n: number) => string; label: string }) {
  const t = useTranslations("Dash");
  const peak = Math.max(0, ...data.map((d) => d.value));
  const max = peak <= 2 ? 2 : Math.ceil(peak / 2) * 2;
  const H = 200;
  const step = 100 / data.length;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  return (
    <figure>
      <div className="flex gap-3">
        <div className="num flex h-[200px] flex-col justify-between py-0 text-right text-[12px] text-ash" aria-hidden="true">
          {[...ticks].reverse().map((v, i) => (
            <span key={i} className="-translate-y-1/2 first:translate-y-0 last:-translate-y-full">
              {format(v)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-[200px] w-full" role="img" aria-label={label}>
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1="0" x2="100" y1={H - f * H} y2={H - f * H} stroke="#3a3a4a" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray={f ? "3 4" : undefined} />
            ))}
            {data.map((d, i) => {
              const h = (d.value / max) * (H - 6);
              const last = i === data.length - 1;
              return (
                <rect key={d.label + i} x={i * step + step * 0.2} y={H - h} width={step * 0.6} height={Math.max(h, d.value ? 2 : 0)} rx="1.2" fill={last ? "#ededf3" : "#5b5b72"}>
                  <title>{`${d.label}: ${format(d.value)}`}</title>
                </rect>
              );
            })}
          </svg>
          <div className="mt-2 flex text-[11px] text-ash" aria-hidden="true">
            {data.map((d, i) => (
              <span key={d.label + i} className="flex-1 text-center">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{t("chartTable")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("month")}</th>
            <th scope="col">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.label + i}>
              <td>{d.label}</td>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[12px] border border-dashed border-slate-line px-6 py-10 text-center text-ash">{children}</p>;
}
