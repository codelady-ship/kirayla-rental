import { describe, expect, it } from "vitest";
import { safeNext } from "@/components/account/auth-form";

describe("post-login redirect", () => {
  it("keeps same-site paths and strips the locale", () => {
    expect(safeNext("/az/trips", "/")).toBe("/trips");
    expect(safeNext("/checkout/3?from=2026-12-01&to=2026-12-02", "/")).toBe("/checkout/3?from=2026-12-01&to=2026-12-02");
  });
  it("refuses open redirects", () => {
    expect(safeNext("https://evil.example", "/")).toBe("/");
    expect(safeNext("//evil.example", "/")).toBe("/");
    expect(safeNext("/\\evil.example", "/")).toBe("/");
    expect(safeNext(null, "/host")).toBe("/host");
  });
});
