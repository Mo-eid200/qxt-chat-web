"use client";

import {
  useMemo,
} from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  qxtApiClient,
  getStoredToken,
  getStoredContext,
} from "../lib/api/core/qxtClient";

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

const DEFAULT_BILLING_DATA: BillingData = {
  plan: "Free",
  balance: 0,
  qPowerRemaining: 0,
  fairUseLimit: 0,
  monthlyUsed: 0,
  utilizationRatio: 0,
  renewalDate: null,
  subscriptionStatus: "free",
};

async function fetchBilling(): Promise<BillingData> {
  try {
    const res = await qxtApiClient.get(
      "/api/v1/company/dashboard/overview",
      {
        timeout: 15000,
      }
    );

    const data = res.data;

    const fairUseLimit = Number(
      data.fair_use_limit || 0
    );

    const monthlyUsed = Number(
      data.monthly_used_q_power ??
      data.monthly_used_qxt ??
      0
    );

    const remaining = Math.max(
      fairUseLimit - monthlyUsed,
      0
    );

    return {
      plan: data.plan_name || "Free",
      balance: Number(
        data.q_power_balance ??
        data.qxt_balance ??
        0
      ),
      qPowerRemaining: remaining,
      fairUseLimit,
      monthlyUsed,
      utilizationRatio:
        fairUseLimit > 0
          ? monthlyUsed / fairUseLimit
          : 0,
      renewalDate:
        data.renewal_date || null,
      subscriptionStatus:
        data.subscription_status ===
        "active"
          ? "active"
          : data.subscription_status ===
              "expired"
            ? "expired"
            : "free",
    };
  } catch {
    return DEFAULT_BILLING_DATA;
  }
}

export function useBilling(
  autoRefreshMs?: number
) {
  const queryClient = useQueryClient();

  const hasToken = !!getStoredToken();

  const runtime = useMemo(
    () => getStoredContext(),
    []
  );

  const hasCompanyContext = Boolean(
    runtime?.companyId
  );

  const billingEnabled =
    hasToken && hasCompanyContext;

  const query = useQuery({
    queryKey: [
      "billing",
      runtime?.companyId ?? null,
    ],
    queryFn: fetchBilling,
    enabled: billingEnabled,
    staleTime: 30_000,
    refetchInterval:
      billingEnabled && autoRefreshMs
        ? autoRefreshMs
        : false,
    refetchOnWindowFocus: false,
    retry: false,
    initialData: DEFAULT_BILLING_DATA,
  });

  function decrementQPower(
    tokensUsed: number
  ) {
    queryClient.setQueryData<BillingData>(
      [
        "billing",
        runtime?.companyId ?? null,
      ],
      (old) => {
        if (!old) return old;

        const newUsed =
          old.monthlyUsed + tokensUsed;

        const newRemaining = Math.max(
          old.fairUseLimit - newUsed,
          0
        );

        return {
          ...old,
          monthlyUsed: newUsed,
          qPowerRemaining: newRemaining,
          utilizationRatio:
            old.fairUseLimit > 0
              ? newUsed /
                old.fairUseLimit
              : 0,
        };
      }
    );
  }

  function refreshBilling() {
    if (!billingEnabled) {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: [
        "billing",
        runtime?.companyId ?? null,
      ],
    });
  }

  function isLocked(): boolean {
    const data = query.data;
    if (!data) return false;

    if (
      data.subscriptionStatus ===
      "expired"
    ) {
      return true;
    }

    if (
      data.fairUseLimit > 0 &&
      data.qPowerRemaining <= 0
    ) {
      return true;
    }

    return false;
  }

  function usageWarningLevel():
    | "safe"
    | "warning"
    | "danger" {
    const data = query.data;
    if (!data) return "safe";

    if (data.utilizationRatio >= 1) {
      return "danger";
    }

    if (data.utilizationRatio >= 0.8) {
      return "warning";
    }

    return "safe";
  }

  return {
    ...(query.data || DEFAULT_BILLING_DATA),
    loading:
      billingEnabled
        ? query.isLoading
        : false,
    error:
      billingEnabled && query.error
        ? "Failed to load billing data"
        : null,
    decrementQPower,
    refreshBilling,
    isLocked,
    usageWarningLevel,
    enabled: billingEnabled,
  };
}