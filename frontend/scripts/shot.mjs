// Viewport-sized review shots (not full page) so details are legible when reviewing.
//   node scripts/shot.mjs <outDir> '<json [{name,url,as?,w,h?,y?,click?}]>'
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const WEB = process.env.BASE_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8080";
const out = path.resolve(process.argv[2]);
const jobs = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
fs.mkdirSync(out, { recursive: true });

const cache = {};
async function tokens(email) {
  if (cache[email]) return cache[email];
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Demo1234!" }) });
  const j = await r.json();
  return (cache[email] = { accessToken: j.accessToken, refreshToken: j.refreshToken });
}

const browser = await chromium.launch();
for (const j of jobs) {
  const ctx = await browser.newContext({ viewport: { width: j.w, height: j.h ?? (j.w < 500 ? 844 : 900) }, locale: "az-AZ", timezoneId: "Asia/Baku" });
  if (j.as) {
    const t = await tokens(j.as);
    await ctx.addInitScript((t) => localStorage.setItem("kirayla.auth", JSON.stringify(t)), t);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  await page.goto(WEB + j.url, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => errors.push(e.message.slice(0, 80)));
  await page.waitForTimeout(1200);
  if (j.click) {
    await page.locator(j.click).first().click().catch((e) => errors.push("click: " + e.message.slice(0, 80)));
    await page.waitForTimeout(600);
  }
  if (j.y) {
    await page.evaluate((y) => window.scrollTo(0, y), j.y);
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: path.join(out, `${j.name}.png`), animations: "disabled", timeout: 90000 });
  console.log(j.name, errors.length ? errors.join(" | ") : "ok");
  await ctx.close();
}
await browser.close();
