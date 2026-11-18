import { expect, test, type Page } from "@playwright/test";

/** Every flow from the brief, end to end, against the real API + seed. Fails on any console error. */

const run = Date.now().toString(36);
const renter = { name: "Test Kirayəçi", email: `e2e-${run}@kirayla.test`, password: "Sinaq12345" };
const title = `E2E dron ${run}`;

function iso(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function watchConsole(page: Page) {
  const errors: string[] = [];
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
  await page.getByLabel("Şifrə", { exact: true }).fill(password);
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
    await page.getByLabel("Şifrə", { exact: true }).fill(renter.password);
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

  test("renter books with the calendar; overlapping request is refused", async ({ page }) => {
    const errors = watchConsole(page);
    await login(page, renter.email, renter.password);
    await page.goto("/az/listing/5"); // Rəşad's studio lights (min 1 day)
    await page.locator("#book").getByRole("button", { name: /Götürmə/ }).click();
    await page.locator(`#book [data-day="${iso(0)}"]`).click();
    await page.locator(`#book [data-day="${iso(1)}"]`).click();
    await expect(page.locator("#book").getByText("Ödəniləcək (depozitlə)")).toBeVisible();
    await page.locator("#book").getByRole("button", { name: "Bron et" }).click();
    await page.waitForURL(/\/checkout\/5\?/);
    await page.getByLabel("Ev sahibinə mesaj (istəyə bağlı)").fill("Salam! Sabah götürə bilərəm.");
    await page.getByRole("button", { name: "Sorğu göndər" }).click();
    await page.waitForURL(/\/trips$/);
    await expect(page.getByText("Studiya işıq").first()).toBeVisible();

    // same dates again → server-side overlap check answers 409
    await page.goto(`/az/checkout/5?from=${iso(0)}&to=${iso(1)}`);
    await page.getByRole("button", { name: "Sorğu göndər" }).click();
    await expect(page.getByText("Bu tarixlər artıq tutulub")).toBeVisible();
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
