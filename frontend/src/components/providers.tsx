"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { api, API_CONFIGURED, ApiError, readTokens, writeTokens } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

// ---- toasts ------------------------------------------------------------------------------
type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<{ toast: (text: string, tone?: Toast["tone"]) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4800);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md animate-zone-in rounded-2xl px-5 py-3 text-[15px] shadow-[var(--shadow-overlay)] ${
              t.tone === "error" ? "bg-[#3b1219] text-white" : "bg-[#222] text-white"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Turns any thrown error into a friendly toast (the demo admin's 403 gets its own message). */
export function useApiErrorToast() {
  const { toast } = useToast();
  const t = useTranslations("Common");
  return useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === "DEMO_READ_ONLY") return toast(t("demoReadOnly"), "error");
        if (e.code === "DEMO_PROTECTED") return toast(t("demoProtected"), "error");
        if (e.status === 0) return toast(t("network"), "error");
        return toast(e.message || t("error"), "error");
      }
      toast(t("error"), "error");
    },
    [toast, t],
  );
}

// ---- auth --------------------------------------------------------------------------------
type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; city?: string }) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
};
const AuthCtx = createContext<AuthState | null>(null);
export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const restore =
      API_CONFIGURED && readTokens()
        ? api<User>("/api/auth/me", { timeoutMs: 20000 })
            .then((u) => {
              if (alive) setUser(u);
            })
            .catch((e) => {
              if (e instanceof ApiError && (e.status === 401 || e.status === 403)) writeTokens(null);
            })
        : Promise.resolve();
    void restore.finally(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const accept = (r: AuthResponse) => {
    writeTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
    setUser(r.user);
    return r.user;
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      setUser,
      login: async (email, password) => accept(await api<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password }, auth: false })),
      register: async (input) => accept(await api<AuthResponse>("/api/auth/register", { method: "POST", body: input, auth: false })),
      logout: () => {
        // revoke the refresh token on the server (best effort), then forget both tokens locally
        const refreshToken = readTokens()?.refreshToken;
        if (refreshToken && API_CONFIGURED) void api("/api/auth/logout", { method: "POST", body: { refreshToken }, auth: false }).catch(() => {});
        writeTokens(null);
        setUser(null);
      },
    }),
    [user, ready],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// ---- wishlist ----------------------------------------------------------------------------
const NO_IDS: Set<number> = new Set();
type WishState = { ids: Set<number>; toggle: (id: number) => Promise<boolean | null> };
const WishCtx = createContext<WishState>({ ids: new Set(), toggle: async () => null });
export const useWishlist = () => useContext(WishCtx);

function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // ids belong to one account: after logout / account switch the old set is ignored, not cleared in an effect
  const [saved, setSaved] = useState<{ owner: number | null; ids: Set<number> }>({ owner: null, ids: NO_IDS });
  const onError = useApiErrorToast();
  const userId = user?.id ?? null;
  const ids = userId !== null && saved.owner === userId ? saved.ids : NO_IDS;
  const setIds = useCallback(
    (fn: (s: Set<number>) => Set<number>) => setSaved((s) => ({ owner: userId, ids: fn(s.owner === userId ? s.ids : NO_IDS) })),
    [userId],
  );

  useEffect(() => {
    if (userId === null) return;
    let alive = true;
    api<number[]>("/api/wishlist/ids")
      .then((xs) => {
        if (alive) setSaved({ owner: userId, ids: new Set(xs) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const toggle = useCallback(
    async (id: number) => {
      if (!user) return null;
      const has = ids.has(id);
      setIds((s) => {
        const n = new Set(s);
        if (has) n.delete(id);
        else n.add(id);
        return n;
      });
      try {
        await api(`/api/wishlist/${id}`, { method: has ? "DELETE" : "PUT" });
        return !has;
      } catch (e) {
        setIds((s) => {
          const n = new Set(s);
          if (has) n.add(id);
          else n.delete(id);
          return n;
        });
        onError(e);
        return null;
      }
    },
    [ids, user, onError, setIds],
  );
  return <WishCtx.Provider value={{ ids, toggle }}>{children}</WishCtx.Provider>;
}

// ---- cold-start demo mode ----------------------------------------------------------------
const DemoCtx = createContext<{ demo: boolean; setDemo: (v: boolean) => void }>({ demo: false, setDemo: () => {} });
export const useDemoMode = () => useContext(DemoCtx);

function DemoProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(false);
  return <DemoCtx.Provider value={{ demo, setDemo }}>{children}</DemoCtx.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DemoProvider>
        <AuthProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </AuthProvider>
      </DemoProvider>
    </ToastProvider>
  );
}
