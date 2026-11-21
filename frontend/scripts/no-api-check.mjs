// Proves the "no API configured" mode: a build made WITHOUT NEXT_PUBLIC_API_URL must render from the bundled
// demo snapshot and send no request to any API host.
//   npm run build && npm start   (NEXT_PUBLIC_API_URL unset)   →   node scripts/no-api-check.mjs
import { chromium } from "@playwright/test";

const WEB = process.env.BASE_URL ?? "http://localhost:3000";
const allowed = [new URL(WEB).host, "thumb.wikimedia.org", "upload.wikimedia.org"]; // the site itself + seed photos
const pages = ["/az", "/en", "/az/c/kempinq", "/az/search?q=dron", "/az/listing/1", "/az/login", "/az/wishlist", "/az/host", "/az/admin"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const foreign = [];
const errors = [];
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.protocol.startsWith("http") && !allowed.includes(u.host)) foreign.push(`${r.method()} ${r.url()}`);
});
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));

let failed = false;
for (const p of pages) {
  await page.goto(WEB + p, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const cards = await page.locator("main article, main a[href*='/listing/']").count();
  const banner = await page.getByRole("status").filter({ hasText: /Demo rejimi|Demo mode|qoşulmayıb|not connected/ }).count();
  console.log(`${p} → ${new URL(page.url()).pathname}  listings=${cards} notice=${banner}`);
}
// the listing pages must really show snapshot data
await page.goto(WEB + "/az/c/kempinq", { waitUntil: "domcontentloaded" });
  await page.locator("main article").first().waitFor({ timeout: 15000 }).catch(() => {});
if ((await page.locator("main article").count()) === 0) {
  failed = true;
  console.log("FAIL: category page shows no snapshot listings");
}
await page.goto(WEB + "/az/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
if (!(await page.getByRole("button", { name: "Daxil ol", exact: true }).isDisabled())) {
  failed = true;
  console.log("FAIL: login is not disabled without an API");
}
await browser.close();
console.log(`requests to other hosts: ${foreign.length}${foreign.length ? "\n  " + foreign.slice(0, 10).join("\n  ") : ""}`);
console.log(`console errors: ${errors.length}${errors.length ? "\n  " + errors.slice(0, 10).join("\n  ") : ""}`);
if (foreign.length || errors.length || failed) process.exit(1);
console.log("OK: no API calls, demo snapshot served");
