import { expect, test, type Page } from "@playwright/test";

/** Every flow from the brief, end to end, against the real API + seed. Fails on any console error. */

const API = process.env.API_URL ?? "http://localhost:8080";
const run = Date.now().toString(36);
const renter = { name: `Test Kirayəçi ${run}`, email: `e2e-${run}@kirayla.test`, password: "Sinaq12345" };
const title = `E2E dron ${run}`;

function iso(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Seed photos are hot-linked from Wikimedia Commons; the tests must not depend on a third-party host being up.
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

function watchConsole(page: Page) {
  const errors: string[] = [];
  void page.route((url) => url.pathname.startsWith("/_next/image") || url.hostname.endsWith("wikimedia.org"), (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  return errors;
}

async function login(page: Page, email: string, password = "Demo1234!") {
  await page.goto("/az/login");
  await page.getByLabel("E-poçt").fill(email);
  await page.locator("#f-password").fill(password);
  await page.getByRole("button", { name: "Daxil ol", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"));
}

async function logout(page: Page) {
  await page.evaluate(() => localStorage.removeItem("kirayla.auth"));
}

test.describe.serial("Kirayla flows", () => {
  test("home → category → listing", async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto("/az");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("kirayla");
    await page.getByRole("navigation", { name: "Kateqoriyalar" }).getByRole("link", { name: "Kempinq" }).click();
    await expect(page).toHaveURL(/\/az\/c\/kempinq/);
    await expect(page.getByRole("heading", { level: 1, name: "Kempinq" })).toBeVisible();
    await page.locator("article").first().getByRole("link").click();
    await expect(page.getByRole("button", { name: /Tarixləri seç|Bron et/ }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("register and list an item with a photo", async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto("/az/register");
    await page.getByLabel("Ad, soyad").fill(renter.name);
    await page.getByLabel("E-poçt").fill(renter.email);
    await page.locator("#f-password").fill(renter.password);
    await page.getByRole("button", { name: "Hesab yarat" }).click();
    await page.waitForURL(/\/az$/);

    await page.goto("/az/host/listings/new");
    await page.getByLabel("Başlıq").fill(title);
    await page.getByLabel("Təsvir").fill("Test üçün dron: iki batareya, pult və çanta daxildir. Avtomatik test yaradıb.");
    await page.getByLabel("Kateqoriya").selectOption({ label: "Foto və video" });
    await page.getByLabel("Günlük qiymət (₼)").fill("33");
    await page.getByRole("button", { name: "Yeni elan" }).click();
    await page.waitForURL(/\/host\/listings\/\d+$/);

    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 400, height: 300 } });
    await page.locator("#photo-input").setInputFiles({ name: "dron.png", mimeType: "image/png", buffer: png });
    await expect(page.getByText("Fotolar yükləndi")).toBeVisible();
    await expect(page.getByRole("button", { name: /Fotonu sil 1/ })).toBeAttached();
    expect(errors).toEqual([]);
  });

  test("search finds the new listing", async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto(`/az/search?q=${encodeURIComponent(title)}`);
    await expect(page.getByRole("link", { name: title })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("filters: city, price ceiling and free dates narrow the results", async ({ page, request }) => {
    const errors = watchConsole(page);
    await page.goto("/az/search");
    const side = page.getByRole("complementary", { name: "Filtrlər" });
    await side.getByLabel("Şəhər").selectOption("Gəncə");
    await side.getByLabel("Maks").fill("15");
    await side.getByLabel("Başlanğıc").fill(iso(40));
    await side.getByLabel("Bitmə").fill(iso(42));
    await side.getByRole("button", { name: "Nəticələri göstər" }).click();
    await expect(page).toHaveURL(/city=G/);
    await expect(page).toHaveURL(/maxPrice=15/);
    await expect(page).toHaveURL(new RegExp(`from=${iso(40)}.*to=${iso(42)}`));
    const cards = page.locator("main article");
    await expect(cards.first()).toBeVisible();
    const query = `city=${encodeURIComponent("Gəncə")}&maxPrice=15&from=${iso(40)}&to=${iso(42)}&size=12`;
    const live = await (await request.get(`${API}/api/listings?${query}`)).json();
    expect(live.totalElements).toBeGreaterThan(0);
    await expect(cards).toHaveCount(Math.min(12, live.totalElements));
    for (const text of await cards.allInnerTexts()) {
      expect(text).toContain("Gəncə");
      expect(Number(/(\d+(?:[.,]\d+)?)\s*₼/.exec(text)![1].replace(",", "."))).toBeLessThanOrEqual(15);
    }
    // sorting is done by the API: cheapest first
    await page.getByLabel("Sırala").selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
    const sorted = await (await request.get(`${API}/api/listings?${query}&sort=price_asc`)).json();
    await expect(cards.first().getByRole("link")).toHaveText(sorted.content[0].title);
    expect(errors).toEqual([]);
  });

  test("wishlist: save from the listing, see it, remove it", async ({ page }) => {
    const errors = watchConsole(page);
    await login(page, renter.email, renter.password);
    await page.goto("/az/listing/3");
    await page.getByRole("button", { name: "Seçilmişlərə əlavə et" }).click();
    await expect(page.getByText("Seçilmişlərə əlavə olundu")).toBeVisible();
    await page.goto("/az/wishlist");
    await expect(page.locator("main article")).toHaveCount(1);
    await page.getByRole("button", { name: "Seçilmişlərdən çıxar" }).click();
    await expect(page.getByText("Bəyəndiyin elanları ürək işarəsi ilə yadda saxla.")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("messages: renter writes to the host, host answers", async ({ page }) => {
    const errors = watchConsole(page);
    const hello = `Salam! Sabah boşdur? (${run})`;
    const reply = `Bəli, boşdur. (${run})`;
    await login(page, renter.email, renter.password);
    await page.goto("/az/listing/5");
    await page.getByRole("button", { name: "Ev sahibinə yaz" }).click();
    await page.getByRole("dialog").getByLabel("Mesaj", { exact: true }).fill(hello);
    await page.getByRole("dialog").getByRole("button", { name: "Göndər" }).click();
    await page.waitForURL(/\/messages\/\d+$/);
    await expect(page.locator("p", { hasText: hello })).toBeVisible();

    await logout(page);
    await login(page, "rashad@kirayla.az");
    await page.goto("/az/messages");
    await page.getByRole("link", { name: new RegExp(renter.name) }).click();
    await expect(page.locator("p", { hasText: hello })).toBeVisible();
    await page.getByLabel("Mesaj", { exact: true }).fill(reply);
    await page.getByRole("button", { name: "Göndər", exact: true }).click();
    await expect(page.locator("p", { hasText: reply })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("renter books with the calendar; overlapping request is refused", async ({ page, request }) => {
    const errors = watchConsole(page);
    await login(page, renter.email, renter.password);
    await page.goto("/az/listing/5"); // Rəşad's studio lights (min 1 day)
    await page.locator("#book").getByRole("button", { name: /Götürmə/ }).click();
    await page.locator(`#book [data-day="${iso(0)}"]`).click();
    await page.locator(`#book [data-day="${iso(1)}"]`).click();
    await expect(page.locator("#book").getByText("Ödəniləcək (depozitlə)")).toBeVisible();
    await page.locator("#book").getByRole("button", { name: "Bron et" }).click();
    await page.waitForURL(/\/checkout\/5\?/);
    await page.locator("#booking-message").fill("Salam! Sabah götürə bilərəm.");
    await page.getByRole("button", { name: "Sorğu göndər" }).click();
    await page.waitForURL(/\/trips$/);
    await expect(page.getByText("Studiya işıq").first()).toBeVisible();

    // same dates again: the checkout page refuses them up front…
    await page.goto(`/az/checkout/5?from=${iso(0)}&to=${iso(1)}`);
    await expect(page.getByText("Bu tarixlərdə əşya məşğuldur")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sorğu göndər" })).toBeDisabled();
    // …and the server-side overlap check answers 409 to a direct request
    const tokens = await page.evaluate(() => JSON.parse(localStorage.getItem("kirayla.auth")!) as { accessToken: string });
    const again = await request.post(`${API}/api/bookings`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      data: { listingId: 5, startDate: iso(0), endDate: iso(1) },
    });
    expect(again.status()).toBe(409);
    expect((await again.json()).code).toBe("BOOKING_CONFLICT");

    // …and a search for those days no longer offers the item
    await page.goto(`/az/c/foto-video?from=${iso(0)}&to=${iso(1)}`);
    await expect(page.locator("main article").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Studiya işıq dəsti/ })).toHaveCount(0);
    await page.goto("/az/c/foto-video");
    await expect(page.getByRole("link", { name: /Studiya işıq dəsti/ })).toBeVisible();
    expect(errors.filter((e) => !e.includes("409"))).toEqual([]);
  });

  test("host accepts and completes; renter reviews", async ({ page }) => {
    const errors = watchConsole(page);
    await login(page, "rashad@kirayla.az");
    await page.goto("/az/host");
    const row = page.getByRole("row").filter({ hasText: renter.name });
    await row.getByRole("button", { name: /Təsdiqlə/ }).click();
    await expect(page.getByText("Sorğu təsdiqləndi")).toBeVisible();
    await page.goto("/az/host/bookings");
    await page.getByRole("button", { name: "Təsdiqlənib", exact: true }).click();
    await page.getByRole("row").filter({ hasText: renter.name }).getByRole("button", { name: "Tamamlandı" }).click();
    await expect(page.getByText("Kirayə tamamlandı")).toBeVisible();

    await logout(page);
    await login(page, renter.email, renter.password);
    await page.goto("/az/trips");
    await page.getByRole("button", { name: "Rəy yaz" }).first().click();
    await page.getByText("4 ulduz").click({ force: true });
    await page.getByLabel("Rəy", { exact: true }).fill("İşıqlar əla idi, təhvil vaxtında oldu.");
    await page.getByRole("button", { name: "Rəyi göndər" }).click();
    await expect(page.getByText("Təşəkkürlər! Rəyin dərc olundu.")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("demo admin can look but not touch", async ({ page }) => {
    const errors = watchConsole(page);
    await login(page, "demo-admin@kirayla.az");
    await page.waitForURL(/\/admin$/);
    await expect(page.getByText("Demo admin: hər şeyi görə bilərsən")).toBeVisible();
    await expect(page.getByText("Dövriyyə (GMV)")).toBeVisible();
    await page.goto("/az/admin/listings");
    await page.getByRole("button", { name: "Gizlət" }).first().click();
    await expect(page.getByText("Demo admin yalnız oxuma rejimindədir")).toBeVisible();
    expect(errors.filter((e) => !e.includes("403"))).toEqual([]);
  });

  test("demo admin writes are refused by the API itself, not just the UI", async ({ request }) => {
    const auth = await (await request.post(`${API}/api/auth/login`, { data: { email: "demo-admin@kirayla.az", password: "Demo1234!" } })).json();
    const headers = { Authorization: `Bearer ${auth.accessToken}` };
    expect((await request.get(`${API}/api/admin/stats`, { headers })).status()).toBe(200);
    const writes: [string, string, unknown?][] = [
      ["PATCH", "/api/admin/users/2", { blocked: true }],
      ["PATCH", "/api/admin/listings/1", { status: "HIDDEN" }],
      ["PATCH", "/api/admin/reports/1", { status: "RESOLVED" }],
      ["POST", "/api/admin/categories", { slug: "x", nameAz: "x", nameEn: "x", icon: "camera", sortOrder: 99 }],
      ["DELETE", "/api/admin/categories/1"],
      ["PUT", "/api/users/me", { name: "Changed" }],
      ["POST", "/api/bookings", { listingId: 1, startDate: iso(200), endDate: iso(201) }],
      ["PUT", "/api/wishlist/1"],
      ["DELETE", "/api/listings/1"],
    ];
    for (const [method, path, data] of writes) {
      const res = await request.fetch(API + path, { method, headers, data });
      expect(res.status(), `${method} ${path}`).toBe(403);
      expect((await res.json()).code, `${method} ${path}`).toBe("DEMO_READ_ONLY");
    }
    // nothing changed
    expect((await (await request.get(`${API}/api/listings/1`)).json()).status).toBe("ACTIVE");
    // a normal user cannot reach admin endpoints at all, and neither can a guest
    const user = await (await request.post(`${API}/api/auth/login`, { data: { email: "aysel@kirayla.az", password: "Demo1234!" } })).json();
    expect((await request.get(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${user.accessToken}` } })).status()).toBe(403);
    expect((await request.get(`${API}/api/admin/stats`)).status()).toBe(401);
  });

  test("demo account buttons sign in with one click", async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto("/az/login");
    await page.getByRole("button", { name: /Kirayəçi — Aysel/ }).click();
    await page.waitForURL(/\/az$/);
    await logout(page);
    await page.goto("/az/login");
    await page.getByRole("button", { name: /Ev sahibi — Rəşad/ }).click();
    await page.waitForURL(/\/host$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Rəşad");
    expect(errors).toEqual([]);
  });

  test("embeddable by the portfolio only: CSP frame-ancestors, no X-Frame-Options", async ({ request }) => {
    for (const path of ["/az", "/en/listing/1", "/az/admin", "/az/host", "/llms.txt"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-security-policy"], path).toBe("frame-ancestors 'self' https://antiqa-portfolio.vercel.app https://antiqacode.vercel.app");
      expect(res.headers()["x-frame-options"], path).toBeUndefined();
    }
  });

  test("API unreachable: demo snapshot instead of a broken page; slow API falls back after ~8 s", async ({ page }) => {
    test.setTimeout(90_000);
    const errors = watchConsole(page);
    await page.route(`${API}/**`, (route) => route.abort("connectionrefused"));
    await page.goto("/az/c/kempinq");
    await expect(page.getByText("Server oyanır")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main article").first()).toBeVisible();
    await page.unroute(`${API}/**`);

    // cold start: the API accepts the request but does not answer — skeletons first, snapshot at 8 s
    await page.route(`${API}/**`, () => {});
    const t0 = Date.now();
    await page.goto("/az/c/aletler");
    await expect(page.locator("main article").first()).toBeVisible({ timeout: 20_000 });
    expect(Date.now() - t0).toBeGreaterThan(7000);
    await expect(page.getByText("Server oyanır")).toBeVisible();
    // only the blocked requests themselves may be logged
    expect(errors.filter((e) => !/ERR_CONNECTION_REFUSED|ERR_FAILED|Failed to load resource/.test(e))).toEqual([]);
  });

  test("real admin moderates a listing", async ({ page }) => {
    const errors = watchConsole(page);
    await login(page, "admin@kirayla.local", "admin-dev-only");
    await page.goto("/az/admin/reports");
    await expect(page.getByRole("heading", { name: "Şikayətlər" })).toBeVisible();
    await page.getByRole("button", { name: "Həll olundu" }).first().click();
    await expect(page.getByText("Yadda saxlandı")).toBeVisible();
    expect(errors).toEqual([]);
  });
});
