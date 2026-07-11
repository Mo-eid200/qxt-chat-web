"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import { fetchBillingOverview } from "../lib/api/auth/auth.api";
import { mapBillingResponse, DEFAULT_BILLING_STATE } from "../lib/api/auth/auth.mapper";
import { getStoredContext } from "../lib/api/core/qxtClient";
import type { AppState } from "../lib/api/auth/auth.types";

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppState | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shouldLoadBilling(pathname: string | null): boolean {
  const runtime = getStoredContext();
  const isChatRoute = pathname?.startsWith("/qxt-chat") ?? false;
  return runtime.spaceType === "workspace" && !isChatRoute;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname               = usePathname();
  const { user }               = useAuth();
  const [billing, setBilling]  = useState(DEFAULT_BILLING_STATE);
  const mountedRef             = useRef(true);

  // Tracks which userId we've already loaded billing for — stops
  // route-change re-fetches dead cold.
  const loadedForRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadBilling = useCallback(async (force = false): Promise<void> => {
    if (!user) return;

    const uid = String(user.id ?? user.email);
    if (!force && loadedForRef.current === uid) return;

    if (!shouldLoadBilling(pathname)) {
      setBilling(DEFAULT_BILLING_STATE);
      loadedForRef.current = uid;
      return;
    }

    try {
      const raw = await fetchBillingOverview();
      if (!mountedRef.current) return;
      setBilling(mapBillingResponse(raw));
      loadedForRef.current = uid;
    } catch {
      if (mountedRef.current) setBilling(DEFAULT_BILLING_STATE);
    }
  }, [user, pathname]);

  // ── Only re-fetch when the user identity changes, NOT on route change ─────
  useEffect(() => {
    if (!user) {
      setBilling(DEFAULT_BILLING_STATE);
      loadedForRef.current = null;
      return;
    }
    loadBilling();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => loadBilling(true), [loadBilling]);

  const value = useMemo<AppState>(
    () => ({
      user,
      role: user?.role ?? null,
      ...billing,
      refresh,
    }),
    [user, billing, refresh]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}