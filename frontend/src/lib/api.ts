import type { AuthResponse, SearchParams } from "./types";

/**
 * Base URL of the Spring Boot API. There is deliberately NO default: when NEXT_PUBLIC_API_URL is not set
 * (e.g. a Vercel deploy made before the API exists) the site makes no API calls at all and serves the
 * bundled demo snapshot instead.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
export const API_CONFIGURED = API_URL !== "";
/** How long a public read may take before the UI switches to the bundled demo snapshot (Render cold start). */
export const COLD_START_MS = 8000;

const STORAGE_KEY = "kirayla.auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ColdStartError extends Error {
  constructor() {
    super("API did not answer in time");
    this.name = "ColdStartError";
  }
}

// ---- token storage (browser only) ---------------------------------------------------------
type Stored = Pick<AuthResponse, "accessToken" | "refreshToken">;

export function readTokens(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: Stored | null) {
  if (typeof window === "undefined") return;
  try {
    if (tokens) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked (private mode / partitioned iframe): stay logged in for this page only */
  }
  memoryTokens = tokens;
}

let memoryTokens: Stored | null = null;
const currentTokens = () => readTokens() ?? memoryTokens;

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  const tokens = currentTokens();
  if (!tokens?.refreshToken || !API_CONFIGURED) return false;
  refreshing ??= fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  })
    .then(async (r) => {
      if (!r.ok) {
        writeTokens(null);
        return false;
      }
      const data = (await r.json()) as AuthResponse;
      writeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** abort after this many ms with ColdStartError */
  timeoutMs?: number;
  auth?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const { body, timeoutMs, auth = true, headers, ...rest } = opts;
  if (!API_CONFIGURED) throw new ApiError(0, "NO_API", "API is not configured");
  const h = new Headers(headers);
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) h.set("Content-Type", "application/json");
  const tokens = auth ? currentTokens() : null;
  if (tokens?.accessToken) h.set("Authorization", `Bearer ${tokens.accessToken}`);

  const controller = new AbortController();
  let timedOut = false;
  const timer = timeoutMs
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : null;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: h,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: rest.signal ?? controller.signal,
    });
  } catch (e) {
    if (timedOut) throw new ColdStartError();
    throw new ApiError(0, "NETWORK", e instanceof Error ? e.message : "Network error");
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 401 && tokens?.refreshToken && !retried && !path.startsWith("/api/auth/")) {
    if (await refresh()) return api<T>(path, opts, true);
  }
  if (!res.ok) {
    let payload: { code?: string; message?: string; fieldErrors?: Record<string, string> } = {};
    try {
      payload = await res.json();
    } catch {
      /* empty body */
    }
    throw new ApiError(res.status, payload.code ?? "HTTP_" + res.status, payload.message ?? res.statusText, payload.fieldErrors);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function toQuery(params: SearchParams | Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Server-side read with a hard timeout. `status` is 0 when the API is asleep or unreachable,
 * so callers can tell "not found" (404) apart from "fall back to the demo snapshot".
 */
export async function serverGet<T>(path: string, revalidate = 300, timeoutMs = COLD_START_MS): Promise<{ data: T | null; status: number }> {
  if (!API_CONFIGURED) return { data: null, status: 0 };
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { data: null, status: res.status };
    return { data: (await res.json()) as T, status: res.status };
  } catch {
    return { data: null, status: 0 };
  }
}
