import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { API_CONFIGURED, API_URL } from "@/lib/api";
import { brand } from "../brand";
import { Wordmark } from "../ui";

const CATS = [
  ["foto-video", "Foto və video", "Photo & video"],
  ["aletler", "Alətlər", "Tools"],
  ["kempinq", "Kempinq", "Camping"],
  ["oyun", "Oyun konsolları", "Gaming"],
  ["geyim", "Geyim", "Clothing"],
] as const;

/** Discovery pages close on a dark slate band; market pages on the quiet off-white footer. */
export function Footer({ tone, locale }: { tone: "discovery" | "market"; locale: string }) {
  const t = useTranslations("Footer");
  const tn = useTranslations("Nav");
  const dark = tone === "discovery";
  // same content edges as the header of the zone: 1200px on the home page, 1440px in the market
  const wrap = dark ? "max-w-[1200px] lg:px-8 2xl:max-w-[1440px]" : "max-w-[1440px] lg:px-10";
  const head = `mb-2 text-[14px] font-semibold ${dark ? "text-white" : "text-hof"}`;
  const link = `inline-flex min-h-11 min-w-11 items-center text-[14px] transition-colors ${dark ? "text-[#d6d1ce] hover:text-white" : "text-foggy hover:text-hof"}`;

  return (
    <footer className={dark ? "bg-slate-ink text-[#d6d1ce]" : "border-t border-hair bg-faint text-foggy"}>
      <div className={`mx-auto grid gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] ${wrap}`}>
        <div className="max-w-sm">
          <Wordmark zone={dark ? "discovery" : "market"} size={26} className={dark ? "text-white" : "text-hof"} />
          <p className="mt-4 text-[14px] leading-relaxed">{t.rich("about", { brand })}</p>
        </div>
        <div>
          <h2 className={head}>{t("explore")}</h2>
          <ul>
            {CATS.map(([slug, az, en]) => (
              <li key={slug}>
                <Link href={`/c/${slug}`} className={link}>
                  {locale === "en" ? en : az}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={head}>{t("host")}</h2>
          <ul>
            <li>
              <Link href="/host/listings/new" className={link}>
                {tn("becomeHost")}
              </Link>
            </li>
            <li>
              <Link href="/host" className={link}>
                {tn("hostDashboard")}
              </Link>
            </li>
            <li>
              <Link href="/#how" className={link}>
                {t("howItWorks")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className={head}>{t("company")}</h2>
          <ul>
            {API_CONFIGURED && (
              <li>
                <a href={`${API_URL}/swagger-ui.html`} className={link} rel="noopener">
                  {t("api")}
                </a>
              </li>
            )}
            <li>
              <a href="https://github.com/codelady-ship/share-rental" className={link} rel="noopener">
                {t("source")}
              </a>
            </li>
            <li>
              <a href="/llms.txt" className={link} translate="no">
                llms.txt
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className={`border-t ${dark ? "border-white/10" : "border-hair"}`}>
        <div className={`mx-auto flex flex-col gap-2 px-4 py-6 text-[13px] sm:px-6 md:flex-row md:justify-between ${wrap}`}>
          <p>{t.rich("rights", { year: new Date().getFullYear(), brand })}</p>
          <p className="max-w-xl md:text-right">{t.rich("credits", { brand })}</p>
        </div>
      </div>
    </footer>
  );
}
