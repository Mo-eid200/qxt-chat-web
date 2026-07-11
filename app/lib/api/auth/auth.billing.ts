import { getStoredContext } from "../../api/core/qxtClient";
import { fetchBillingOverview } from "./auth.api";            
import { mapBillingResponse, DEFAULT_BILLING_STATE } from "./auth.mapper"; 
import type { BillingState } from "./auth.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shouldLoadBilling(): boolean {
  const runtime = getStoredContext();
  return runtime.spaceType === "workspace" && !!runtime.companyId;
}

// ─── Billing Loader ───────────────────────────────────────────────────────────

export async function fetchBillingState(): Promise<BillingState> {
  try {
    if (!shouldLoadBilling()) return DEFAULT_BILLING_STATE;

    const response = await fetchBillingOverview(); // ✅
    if (!response) return DEFAULT_BILLING_STATE;

    return mapBillingResponse(response);
  } catch {
    return DEFAULT_BILLING_STATE;
  }
}

// ─── Billing Refresh ──────────────────────────────────────────────────────────

export async function refreshBillingState(): Promise<BillingState> {
  return fetchBillingState();
}

// ─── Billing Reset ────────────────────────────────────────────────────────────

export function createEmptyBillingState(): BillingState {
  return { ...DEFAULT_BILLING_STATE };
}

// ─── Billing Guards ───────────────────────────────────────────────────────────

export function isBillingLocked(billing: BillingState): boolean {
  return billing.isLocked;
}

export function isNearBillingLimit(billing: BillingState): boolean {
  return billing.isNearLimit;
}

export function hasBillingPlan(billing: BillingState): boolean {
  return billing.plan !== "free" && billing.plan !== "Free";
}

export function getBillingUsagePercent(billing: BillingState): number {
  if (billing.fairUseLimit <= 0) return 0;
  return Math.min(
    100,
    Math.round((billing.monthlyUsed / billing.fairUseLimit) * 100)
  );
}

export function getRemainingCredits(billing: BillingState): number {
  return Math.max(0, billing.fairUseLimit - billing.monthlyUsed);
}