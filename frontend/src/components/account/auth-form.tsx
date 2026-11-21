"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { API_CONFIGURED, ApiError } from "@/lib/api";
import { CITIES } from "@/lib/format";
import { safeNext } from "@/lib/safe-next";
import { Icon } from "../icons";
import { useApiErrorToast, useAuth, useToast } from "../providers";
import { brand } from "../brand";
import { Spinner } from "../ui";

export const DEMO_ACCOUNTS = [
  { key: "demoRenter", email: "aysel@kirayla.az", icon: "user" },
  { key: "demoHost", email: "rashad@kirayla.az", icon: "chart" },
  { key: "demoAdmin", email: "demo-admin@kirayla.az", icon: "shield" },
] as const;
export const DEMO_PASSWORD = "Demo1234!";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("Auth");
  const tc = useTranslations("Common");
  const { login, register } = useAuth();
  const { toast } = useToast();
  const onError = useApiErrorToast();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next");
  const [form, setForm] = useState({ name: "", email: "", password: "", city: "Bakı" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const done = (name: string, role: string, demoKey?: string) => {
    toast(t("welcome", { name: name.split(" ")[0] }));
    const fallback = demoKey === "demoAdmin" || role === "ADMIN" ? "/admin" : demoKey === "demoHost" ? "/host" : "/";
    router.replace(safeNext(next, fallback));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setBusy("form");
    try {
      const u =
        mode === "login"
          ? await login(form.email.trim(), form.password)
          : await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, city: form.city });
      done(u.name, u.role);
    } catch (err) {
      if (err instanceof ApiError && (err.code === "BAD_CREDENTIALS" || err.status === 401)) setError(t("badCredentials"));
      else if (err instanceof ApiError && err.code === "EMAIL_TAKEN") setError(t("emailTaken"));
      else if (err instanceof ApiError && err.fieldErrors) setFieldErrors(err.fieldErrors);
      else if (err instanceof ApiError && err.status === 0) setError(tc("network"));
      else onError(err);
    } finally {
      setBusy(null);
    }
  };

  const demo = async (key: string, email: string) => {
    setBusy(key);
    setError(null);
    try {
      const u = await login(email, DEMO_PASSWORD);
      done(u.name, u.role, key);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) setError(tc("network"));
      else onError(err);
    } finally {
      setBusy(null);
    }
  };

  const field = (name: "name" | "email", label: string, type: string, extra: Record<string, unknown>) => (
    <div>
      <label htmlFor={`f-${name}`} className="mb-1.5 block text-[14px] font-medium">
        {label}
      </label>
      <input
        id={`f-${name}`}
        type={type}
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        aria-invalid={fieldErrors[name] ? true : undefined}
        aria-describedby={fieldErrors[name] ? `e-${name}` : undefined}
        className="market-input"
        {...extra}
      />
      {fieldErrors[name] && (
        <p id={`e-${name}`} className="mt-1 text-[13px] text-coral-deep">
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  const carry = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="mx-auto grid max-w-[1000px] gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1fr_340px] md:py-16">
      <div className="max-w-[440px]">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{mode === "login" ? t("loginTitle") : t.rich("registerTitle", { brand })}</h1>
        <p className="mt-2 text-foggy">{mode === "login" ? t("loginSub") : t("registerSub")}</p>
        {!API_CONFIGURED && (
          <p role="status" className="mt-6 rounded-lg bg-[#fff6e5] px-4 py-3 text-[14px] text-[#5c3b00]">
            {tc("noApi")}
          </p>
        )}
        <form onSubmit={submit} className="mt-8 space-y-5">
          {mode === "register" && field("name", t("name"), "text", { required: true, minLength: 2, maxLength: 80, autoComplete: "name" })}
          {field("email", t("email"), "email", { required: true, autoComplete: "email" })}
          <div>
            <label htmlFor="f-password" className="mb-1.5 block text-[14px] font-medium">
              {t("password")}
            </label>
            <div className="relative">
              <input
                id="f-password"
                type={show ? "text" : "password"}
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                aria-describedby={mode === "register" ? "pw-hint" : undefined}
                className="market-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={t("password")}
                aria-pressed={show}
                className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-foggy"
              >
                <Icon name={show ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
            {mode === "register" && (
              <p id="pw-hint" className={`mt-1 text-[13px] ${fieldErrors.password ? "text-coral-deep" : "text-foggy"}`}>
                {fieldErrors.password ?? t("passwordHint")}
              </p>
            )}
          </div>
          {mode === "register" && (
            <div>
              <label htmlFor="f-city" className="mb-1.5 block text-[14px] font-medium">
                {t("city")}
              </label>
              <select id="f-city" className="market-input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-[#fff0f2] px-4 py-3 text-[14px] text-[#9b0a2f]">
              {error}
            </p>
          )}
          <button type="submit" disabled={!!busy || !API_CONFIGURED} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-coral-deep text-[16px] font-semibold text-white disabled:opacity-60">
            {busy === "form" && <Spinner />}
            {mode === "login" ? t("submitLogin") : t("submitRegister")}
          </button>
        </form>
        <p className="mt-6 text-[14px] text-foggy">
          {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
          <Link href={(mode === "login" ? "/register" : "/login") + carry} className="inline-flex min-h-11 items-center font-medium text-hof underline underline-offset-2">
            {mode === "login" ? t("submitRegister") : t("submitLogin")}
          </Link>
        </p>
      </div>

      <aside aria-labelledby="demo-title" className="h-fit rounded-card bg-faint p-6">
        <h2 id="demo-title" className="text-[16px] font-semibold">
          {t("demoTitle")}
        </h2>
        <p className="mt-1 text-[14px] text-foggy">{t("demoText")}</p>
        <ul className="mt-5 space-y-2">
          {DEMO_ACCOUNTS.map((d) => (
            <li key={d.key}>
              <button
                type="button"
                disabled={!!busy || !API_CONFIGURED}
                onClick={() => demo(d.key, d.email)}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-deco bg-white px-4 text-left transition-colors hover:border-hof disabled:opacity-60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-faint">
                  {busy === d.key ? <Spinner className="size-4" /> : <Icon name={d.icon} size={18} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">{t(d.key)}</span>
                  <span className="block truncate text-[12px] text-foggy" translate="no">{d.email}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
