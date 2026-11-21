import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The owner's portfolio opens this demo (incl. the admin panel) in a modal iframe.
const FRAME_ANCESTORS = "frame-ancestors 'self' https://antiqa-portfolio.vercel.app https://antiqacode.vercel.app";

function apiHost(): { protocol: "http" | "https"; hostname: string; port?: string } | null {
  try {
    if (!process.env.NEXT_PUBLIC_API_URL) return null; // no API configured: demo snapshot only
    const u = new URL(process.env.NEXT_PUBLIC_API_URL);
    return { protocol: u.protocol === "https:" ? "https" : "http", hostname: u.hostname, ...(u.port ? { port: u.port } : {}) };
  } catch {
    return null;
  }
}
const api = apiHost();

const nextConfig: NextConfig = {
  images: {
    // seed photos (Wikimedia Commons, licence-safe) + photos uploaded to the API's storage
    remotePatterns: [
      { protocol: "https", hostname: "thumb.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      ...(api && api.hostname !== "localhost" && api.hostname !== "127.0.0.1" ? [api] : []),
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: FRAME_ANCESTORS },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
