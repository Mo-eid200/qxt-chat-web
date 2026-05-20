"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { qxtApiClient, qxtAuthClient } from "../lib/api/core/qxtClient";


type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "free";

type LockReason =
  | "subscription_inactive"
  | "monthly_limit_reached"
  | null;

interface AppState {
  user: any | null;
  role: "admin" | "user" | null;

  plan: string;
  status: SubscriptionStatus;
  balance: number;

  fairUseLimit: number;
  monthlyUsed: number;

  renewalDate: string | null;
  daysRemaining: number;

  isLocked: boolean;
  lockReason: LockReason;
  isNearLimit: boolean;

  refresh: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    role: null,
    plan: "free",
    status: "free",
    balance: 0,
    fairUseLimit: 0,
    monthlyUsed: 0,
    renewalDate: null,
    daysRemaining: 0,
    isLocked: false,
    lockReason: null,
    isNearLimit: false,
    refresh: async () => {},
  });

  const fetchAll = useCallback(async () => {
    try {
      const [authRes, billingRes] = await Promise.allSettled([
        qxtAuthClient.get("/api/v1/auth/me"),
        qxtApiClient.get("/api/v1/company/dashboard/overview"),
      ]);

      const user =
        authRes.status === "fulfilled"
          ? authRes.value.data
          : null;

      const billing =
        billingRes.status === "fulfilled"
          ? billingRes.value.data
          : null;

      // ===============================
      // Guest Mode
      // ===============================
      if (!user) {
        setState((prev) => ({
          ...prev,
          user: null,
          role: null,
          plan: "free",
          status: "free",
          balance: 0,
          fairUseLimit: 0,
          monthlyUsed: 0,
          renewalDate: null,
          daysRemaining: 0,
          isLocked: false,
          lockReason: null,
          isNearLimit: false,
        }));
        return;
      }

      // ===============================
      // User exists but billing failed
      // ===============================
      if (!billing) {
        setState((prev) => ({
          ...prev,
          user,
          role: user.role,
        }));
        return;
      }

      // ===============================
      // Stripe-backed Billing
      // ===============================

      const renewalDate = billing.renewal_date ?? null;
      const daysRemaining = billing.days_remaining ?? 0;

      const isNearLimit =
        billing.fair_use_limit > 0 &&
        billing.monthly_used_qxt /
          billing.fair_use_limit >
          0.8;

      setState((prev) => ({
        ...prev,
        user,
        role: user.role,
        plan: billing.plan_name || "free",
        status: billing.subscription_status || "free",
        balance: billing.qxt_balance || 0,
        fairUseLimit: billing.fair_use_limit || 0,
        monthlyUsed: billing.monthly_used_qxt || 0,
        renewalDate,
        daysRemaining,
        isLocked: billing.is_locked ?? false,
        lockReason: billing.lock_reason ?? null,
        isNearLimit,
      }));
    } catch {
      // Silent fail
    }
  }, []);

useEffect(() => {

  fetchAll();

  const interval = setInterval(fetchAll, 30000);

  return () => clearInterval(interval);

}, [fetchAll]);

  return (
    <AppContext.Provider value={{ ...state, refresh: fetchAll }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppProvider missing");
  return ctx;
}