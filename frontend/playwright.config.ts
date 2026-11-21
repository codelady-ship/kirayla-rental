import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against a running stack:
 *   backend  : cd backend && ./mvnw spring-boot:run      (http://localhost:8080, H2 + seed; restart it for a fresh database before each run)
 *   frontend : npm run build && npm start                 (http://localhost:3000)
 * BASE_URL / API_URL override the defaults.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0, // the flows are one serial story against one database: a retry would meet its own earlier data
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "az-AZ",
    timezoneId: "Asia/Baku",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
