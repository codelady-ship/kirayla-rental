// Canonical origin: explicit env first, then the production domain Vercel assigns to the project, then local dev.
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (vercelDomain ? `https://${vercelDomain}` : "http://localhost:3000")).replace(/\/$/, "");
export const SITE_NAME = "Share";

/** hreflang alternates for a locale-less path like "/listing/3" */
export function alternates(locale: string, path = "") {
  return {
    canonical: `/${locale}${path}`,
    languages: { az: `/az${path}`, en: `/en${path}`, "x-default": `/az${path}` },
  };
}
