// Reports the elements that make a page wider than the viewport.
//   node scripts/overflow.mjs <width> <url> [loginEmail]
import { chromium } from "@playwright/test";
const [w, url, as] = process.argv.slice(2);
const WEB = process.env.BASE_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8080";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(w), height: 900 } });
if (as) {
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: as, password: "Demo1234!" }) });
  const j = await r.json();
  await ctx.addInitScript((t) => localStorage.setItem("kirayla.auth", JSON.stringify(t)), { accessToken: j.accessToken, refreshToken: j.refreshToken });
}
const page = await ctx.newPage();
await page.goto(WEB + url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log(
  await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 1) {
        let clipped = false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) clipped = true;
        if (!clipped) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
      }
    }
    return { scrollWidth: document.documentElement.scrollWidth, vw, offenders: out.slice(0, 12) };
  }),
);
await browser.close();
