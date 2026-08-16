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

import {
  fetchBillingOverview,
} from "../lib/api/auth/auth.api";

import {
  mapBillingResponse,
  DEFAULT_BILLING_STATE,
} from "../lib/api/auth/auth.mapper";

import type {
  AppState,
  BillingState,
  BootstrapSubscription,
  SubscriptionStatus,
} from "../lib/api/auth/auth.types";

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppState | null>(null);

// ─── Cache ────────────────────────────────────────────────────────────────────
//
// Billing cache is per-user.
//
// It contains display/account state only.
// Never store JWT/API keys/secrets here.
//

const BILLING_CACHE_VERSION = "v2";
const BILLING_CACHE_TTL_MS = 30 * 60_000;

type BillingCacheEntry = {
  version: typeof BILLING_CACHE_VERSION;
  userId: string;
  billing: BillingState;
  cachedAt: number;
};

function getBillingCacheKey(userId: string): string {
  return `qxt_billing_cache_${BILLING_CACHE_VERSION}:${userId}`;
}

function readBillingCache(
  userId: string | null
): BillingState | null {
  if (
    typeof window === "undefined" ||
    !userId
  ) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      getBillingCacheKey(userId)
    );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as BillingCacheEntry;

    if (
      parsed.version !== BILLING_CACHE_VERSION ||
      parsed.userId !== userId ||
      !parsed.billing
    ) {
      return null;
    }

    if (
      Date.now() - parsed.cachedAt >
      BILLING_CACHE_TTL_MS
    ) {
      window.localStorage.removeItem(
        getBillingCacheKey(userId)
      );

      return null;
    }

    return parsed.billing;
  } catch {
    return null;
  }
}

function writeBillingCache(
  userId: string | null,
  billing: BillingState
): void {
  if (
    typeof window === "undefined" ||
    !userId
  ) {
    return;
  }

  try {
    const entry: BillingCacheEntry = {
      version: BILLING_CACHE_VERSION,
      userId,
      billing,
      cachedAt: Date.now(),
    };

    window.localStorage.setItem(
      getBillingCacheKey(userId),
      JSON.stringify(entry)
    );
  } catch {
    // Cache is a performance optimization only.
  }
}

// ─── Bootstrap mapping ────────────────────────────────────────────────────────
//
// Bootstrap intentionally carries only the billing information needed
// during application startup.
//
// Fields that bootstrap does NOT provide are preserved from the current
// cached/state value rather than fabricated.
//

function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
  switch (value) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "free":
      return value;

    default:
      return "free";
  }
}

function mapBootstrapSubscription(
  subscription: BootstrapSubscription,
  previous: BillingState
): BillingState {
  const status =
    normalizeSubscriptionStatus(
      subscription.status
    );

  return {
    ...previous,

    plan:
      subscription.plan_name ||
      previous.plan ||
      "free",

    status,

    // Bootstrap exposes monthly credits, but it does not expose
    // monthly usage. Treat credits as the known plan limit while
    // preserving usage information if we previously fetched it.
    fairUseLimit:
      subscription.monthly_credits ?? 0,

    renewalDate:
      subscription.renews_at ?? null,

    // Do NOT invent these fields. Bootstrap currently doesn't
    // provide them, so retain existing cached/full-billing values.
    balance: previous.balance,
    monthlyUsed: previous.monthlyUsed,
    daysRemaining: previous.daysRemaining,
    isLocked: previous.isLocked,
    lockReason: previous.lockReason,

    isNearLimit:
      (subscription.monthly_credits ?? 0) > 0 &&
      previous.monthlyUsed /
        (subscription.monthly_credits ?? 0) >
        0.8,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const {
    user,
    bootstrap,
    authReady,
    loadingUser,
  } = useAuth();

  const userId =
    user?.id != null
      ? String(user.id)
      : null;

  const [billing, setBilling] =
    useState<BillingState>(
      DEFAULT_BILLING_STATE
    );

  const mountedRef = useRef(true);

  const hydratedUserRef =
    useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── localStorage hydration ─────────────────────────────────────────────────
  //
  // Read once when authenticated identity becomes known.
  //

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!userId) {
      setBilling(DEFAULT_BILLING_STATE);
      hydratedUserRef.current = null;
      return;
    }

    if (
      hydratedUserRef.current === userId
    ) {
      return;
    }

    hydratedUserRef.current = userId;

    const cached =
      readBillingCache(userId);

    if (cached) {
      setBilling(cached);
    }
  }, [
    authReady,
    userId,
  ]);

  // ── Bootstrap synchronization ──────────────────────────────────────────────
  //
  // Normal startup/login path.
  //
  // NO billing HTTP request here.
  //

  useEffect(() => {
    if (
      !authReady ||
      loadingUser ||
      !userId ||
      !bootstrap
    ) {
      return;
    }

    setBilling((previous) => {
      const next =
        mapBootstrapSubscription(
          bootstrap.personal_subscription,
          previous
        );

      writeBillingCache(
        userId,
        next
      );

      return next;
    });
  }, [
    authReady,
    loadingUser,
    userId,
    bootstrap,
  ]);

  // ── Explicit full billing refresh ──────────────────────────────────────────
  //
  // This is the ONLY normal path that calls the detailed billing endpoint.
  //
  // It does NOT automatically run:
  // - after login
  // - on route changes
  // - when switching workspace
  // - on every render
  //

  const refresh =
    useCallback(async (): Promise<void> => {
      if (!userId) {
        setBilling(DEFAULT_BILLING_STATE);
        return;
      }

      try {
        const raw =
          await fetchBillingOverview();

        if (!mountedRef.current) {
          return;
        }

        const next =
          mapBillingResponse(raw);

        setBilling(next);

        writeBillingCache(
          userId,
          next
        );
      } catch (error) {
        console.error(
          "[AppContext] Billing refresh failed",
          error
        );

        // Keep existing bootstrap/cache state.
        throw error;
      }
    }, [userId]);

  // ── Optional detailed-page loading ─────────────────────────────────────────
  //
  // We deliberately do NOT automatically fetch billing merely because
  // pathname changed.
  //
  // `pathname` remains observed here only so future billing-specific
  // pages can explicitly opt in without changing the provider contract.
  //

  useEffect(() => {
    void pathname;
  }, [pathname]);

  // ── Context value ──────────────────────────────────────────────────────────

  const value =
    useMemo<AppState>(
      () => ({
        user,
        role: user?.role ?? null,

        ...billing,

        refresh,
      }),
      [
        user,
        billing,
        refresh,
      ]
    );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp(): AppState {
  const context =
    useContext(AppContext);

  if (!context) {
    throw new Error(
      "useApp must be used within <AppProvider>"
    );
  }

  return context;
}