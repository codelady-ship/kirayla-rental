export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Kirayla";

/** hreflang alternates for a locale-less path like "/listing/3" */
export function alternates(locale: string, path = "") {
  return {
    canonical: `/${locale}${path}`,
    languages: { az: `/az${path}`, en: `/en${path}`, "x-default": `/az${path}` },
  };
}
