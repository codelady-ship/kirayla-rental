// Screenshots + layout audit: 6 key pages × 4 widths. Flags horizontal overflow, console errors, tap targets under 44px.
//   LANG_CODE=en · WIDTHS=320,390 · ONLY=home,admin · NOSHOT=1 (audit only) · EXTRA='[{"name":"x","url":"/az/x"}]'
//   node scripts/screenshots.mjs [outDir]       (API on :8080, web on :3000)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const WEB = process.env.BASE_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8080";
const out = path.resolve(process.argv[2] ?? "../docs/screenshots");
fs.mkdirSync(out, { recursive: true });

const iso = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
async function tokens(email, password = "Demo1234!") {
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  const j = await r.json();
  return { accessToken: j.accessToken, refreshToken: j.refreshToken };
}

const lang = process.env.LANG_CODE ?? "az";
const pages = [
  { name: "home", url: `/${lang}` },
  { name: "category", url: `/${lang}/c/foto-video` },
  { name: "listing", url: `/${lang}/listing/1` },
  { name: "booking", url: `/${lang}/checkout/2?from=${iso(30)}&to=${iso(32)}`, as: "aysel@share.az" },
  { name: "host", url: `/${lang}/host`, as: "rashad@share.az" },
  { name: "admin", url: `/${lang}/admin`, as: "demo-admin@share.az" },
  ...(process.env.EXTRA ? JSON.parse(process.env.EXTRA) : []),
];
const widths = (process.env.WIDTHS ?? "1920,1440,768,390").split(",").map(Number);
const only = process.env.ONLY?.split(",");

// Full-page PNGs are 1–5 MB each; the repo keeps WebP at most 1280px wide instead (about 100 KB each).
// Needs ffmpeg on PATH; without it the PNG is kept. PNG=1 keeps PNGs on purpose.
const hasFfmpeg = !process.env.PNG && spawnSync("ffmpeg", ["-version"]).status === 0;
function toWebp(png) {
  if (!hasFfmpeg) return;
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", png, "-vf", "scale='min(1280,iw)':-2", "-c:v", "libwebp", "-q:v", "58", png.replace(/\.png$/, ".webp")]);
  if (r.status === 0) fs.rmSync(png);
}

const browser = await chromium.launch();
const report = [];
const tokenCache = {};
for (const p of pages.filter((p) => !only || only.includes(p.name))) {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : w < 1000 ? 1024 : 900 }, deviceScaleFactor: 1, locale: "az-AZ", timezoneId: "Asia/Baku" });
    if (p.as) {
      tokenCache[p.as] ??= await tokens(p.as);
      await ctx.addInitScript((t) => localStorage.setItem("kirayla.auth", JSON.stringify(t)), tokenCache[p.as]);
    }
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
    await page.goto(WEB + p.url, { waitUntil: "networkidle", timeout: 90000 }).catch((e) => errors.push("goto: " + e.message.slice(0, 100)));
    await page.waitForTimeout(1500);
    // let lazy images in long pages load
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const audit = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const vw = window.innerWidth;
      const wide = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0) return false;
          let a = el.parentElement;
          while (a) {
            const s = getComputedStyle(a);
            if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return false;
            a = a.parentElement;
          }
          return r.right > vw + 1;
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      const small = [...document.querySelectorAll("a, button, input, select, textarea, [role=button]")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return false;
          const s = getComputedStyle(el);
          if (s.visibility === "hidden" || el.closest(".sr-only")) return false;
          if (el.tagName === "A" && el.closest("p, li") && getComputedStyle(el).display === "inline") return false; // inline text links
          if (String(el.className).includes("after:absolute")) return false; // card title: the ::after overlay makes the whole card the target
          return r.width < 43.5 || r.height < 43.5;
        })
        .slice(0, 8)
        .map((el) => `${el.tagName.toLowerCase()}[${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}] ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
      return { overflow: sw > vw, sw, vw, wide, small };
    });
    if (!process.env.NOSHOT) {
      const png = path.join(out, `${p.name}-${w}.png`);
      await page.screenshot({ path: png, fullPage: true, animations: "disabled", timeout: 90000 });
      toWebp(png);
    }
    report.push({ page: p.name, w, ...audit, errors });
    console.log(`${p.name}@${w}: overflow=${audit.overflow}${audit.overflow ? ` (${audit.sw}>${audit.vw}) ${audit.wide.join(" | ")}` : ""} errors=${errors.length}${errors.length ? " " + errors.join(" || ") : ""}${audit.small.length ? " small=" + audit.small.join(", ") : ""}`);
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(out, "_audit.json"), JSON.stringify(report, null, 1));
