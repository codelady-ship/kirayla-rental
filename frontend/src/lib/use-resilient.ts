"use client";

import { useEffect, useRef, useState } from "react";
import { API_CONFIGURED, ApiError, COLD_START_MS } from "./api";
import { useDemoMode } from "@/components/providers";

/**
 * Public reads that survive a sleeping API (Render free tier cold start ~30–60 s):
 *  - the real request starts immediately;
 *  - if nothing arrives within COLD_START_MS (or the network fails), the bundled demo snapshot is shown
 *    and a banner says so;
 *  - the real request keeps retrying in the background and silently replaces the snapshot when it lands.
 * A real HTTP error (404, 400…) is NOT masked by demo data.
 * With no API configured at all, the snapshot is shown at once and nothing is requested.
 */
export function useResilient<T>(key: string, fetcher: () => Promise<T>, fallback: () => T | null) {
  const [state, setState] = useState<{ key: string; data: T | null; error: ApiError | null; demo: boolean }>({
    key,
    data: null,
    error: null,
    demo: false,
  });
  const { setDemo } = useDemoMode();
  const fetcherRef = useRef(fetcher);
  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fetcherRef.current = fetcher;
    fallbackRef.current = fallback;
  });

  useEffect(() => {
    let alive = true;
    let gotReal = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const showFallback = () => {
      if (!alive || gotReal) return;
      const fb = fallbackRef.current();
      if (fb === null) return;
      setState({ key, data: fb, error: null, demo: true });
      setDemo(true);
    };
    if (!API_CONFIGURED) {
      const none = setTimeout(showFallback, 0);
      return () => {
        alive = false;
        clearTimeout(none);
      };
    }
    const timer = setTimeout(showFallback, COLD_START_MS);

    const attempt = (n: number) => {
      fetcherRef.current()
        .then((data) => {
          if (!alive) return;
          gotReal = true;
          clearTimeout(timer);
          setState({ key, data, error: null, demo: false });
          setDemo(false);
        })
        .catch((e: unknown) => {
          if (!alive) return;
          if (e instanceof ApiError && e.status > 0) {
            clearTimeout(timer);
            setState({ key, data: null, error: e, demo: false });
            return;
          }
          // network failure / asleep: show demo now and keep knocking
          showFallback();
          if (n < 12) retry = setTimeout(() => attempt(n + 1), 5000);
        });
    };
    attempt(0);

    return () => {
      alive = false;
      clearTimeout(timer);
      if (retry) clearTimeout(retry);
    };
  }, [key, setDemo]);

  const current = state.key === key ? state : { data: null, error: null, demo: false };
  return { data: current.data, error: current.error, demo: current.demo, loading: current.data === null && current.error === null };
}
