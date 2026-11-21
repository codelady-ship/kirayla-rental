/** Only same-site relative paths (never protocol-relative or absolute URLs); strips a locale prefix. */
export function safeNext(next: string | null, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next.replace(/^\/(az|en)(?=\/|$|\?)/, "") || "/";
}
