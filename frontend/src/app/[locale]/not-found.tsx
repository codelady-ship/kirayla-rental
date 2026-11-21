import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/ui";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <main id="main" data-zone="discovery" className="flex min-h-dvh flex-col items-center justify-center bg-mist px-4 text-center">
      <Wordmark className="text-[48px]" />
      <p className="num mt-10 text-[12px] text-stone">404</p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.045em]">{t("title")}</h1>
      <p className="mt-2 max-w-sm text-stone">{t("text")}</p>
      <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-violet px-7 text-white shadow-[var(--shadow-violet)]">
        {t("cta")}
      </Link>
    </main>
  );
}
