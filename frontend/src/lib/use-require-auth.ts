"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/components/providers";

/** Client-side guard for account pages: sends guests to /login?next=<here>. */
export function useRequireAuth(role?: "ADMIN") {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      const qs = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/login?next=${encodeURIComponent(pathname + qs)}`);
    }
  }, [ready, user, router, pathname]);
  return { user, ready, allowed: !!user && (!role || user.role === role) };
}
