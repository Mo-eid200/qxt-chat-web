// hooks/useBilling.ts
"use client";

import {
  useQuery,
  useQueryClient,
  QueryClient,
} from "@tanstack/react-query";
import { qxtApiClient, qxtAuthClient } from "../lib/api/core/qxtClient";

const baseURL =
  process.env.NEXT_PUBLIC_QXT_API_BASE_URL || "http://127.0.0.1:8000";

export interface BillingData {
  plan: string;
  balance: number;
  qPowerRemaining: number;
  fairUseLimit: number;
  monthlyUsed: number;
  utilizationRatio: number;
  renewalDate: string | null;
  subscriptionStatus: "active" | "expired" | "free";
}

async function fetchBilling(): Promise<BillingData> {
const res = await qxtApiClient.get(
  "/api/v1/company/dashboard/overview"
);
  const data = res.data;

  const fairUseLimit = Number(data.fair_use_limit || 0);
  const monthlyUsed = Number(data.monthly_used_qxt || 0);
  const remaining = Math.max(fairUseLimit - monthlyUsed, 0);

  return {
    plan: data.plan_name || "Free",
    balance: Number(data.qxt_balance || 0),
    qPowerRemaining: remaining,
    fairUseLimit,
    monthlyUsed,
    utilizationRatio:
      fairUseLimit > 0 ? monthlyUsed / fairUseLimit : 0,
    renewalDate: data.renewal_date || null,
    subscriptionStatus:
      data.subscription_status === "active"
        ? "active"
        : data.subscription_status === "expired"
        ? "expired"
        : "free",
  };
}

export function useBilling(autoRefreshMs?: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["billing"],
    queryFn: fetchBilling,
    staleTime: 30_000,
    refetchInterval: autoRefreshMs || false,
    refetchOnWindowFocus: false,
  });

  // 🔥 Optimistic Decrement
  function decrementQPower(tokensUsed: number) {
    queryClient.setQueryData<BillingData>(["billing"], (old) => {
      if (!old) return old;

      const newUsed = old.monthlyUsed + tokensUsed;
      const newRemaining = Math.max(old.fairUseLimit - newUsed, 0);

      return {
        ...old,
        monthlyUsed: newUsed,
        qPowerRemaining: newRemaining,
        utilizationRatio:
          old.fairUseLimit > 0
            ? newUsed / old.fairUseLimit
            : 0,
      };
    });
  }

  // 🔄 Manual refresh
  function refreshBilling() {
    queryClient.invalidateQueries({ queryKey: ["billing"] });
  }

  // 🔒 Auto lock helper
  function isLocked(): boolean {
    const data = query.data;
    if (!data) return false;

    if (data.subscriptionStatus === "expired") return true;
    if (data.qPowerRemaining <= 0) return true;

    return false;
  }

  // ⚠️ Warning level
  function usageWarningLevel(): "safe" | "warning" | "danger" {
    const data = query.data;
    if (!data) return "safe";

    if (data.utilizationRatio >= 1) return "danger";
    if (data.utilizationRatio >= 0.8) return "warning";
    return "safe";
  }

  return {
    ...query.data,
    loading: query.isLoading,
    error: query.error ? "Failed to load billing data" : null,
    decrementQPower,
    refreshBilling,
    isLocked,
    usageWarningLevel,
  };
}  