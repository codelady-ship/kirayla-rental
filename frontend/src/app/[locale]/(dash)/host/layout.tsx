import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DashShell } from "@/components/dash/shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashShell kind="host">{children}</DashShell>;
}
