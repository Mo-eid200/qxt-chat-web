import type { BillingState, RawBillingResponse, RawApiKey } from "./auth.types";

// ─── Billing ──────────────────────────────────────────────────────────────────

export const DEFAULT_BILLING_STATE: BillingState = {
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
};

export function mapBillingResponse(raw: RawBillingResponse): BillingState {
  const fairUseLimit = raw.fair_use_limit ?? 0;
  const monthlyUsed = raw.monthly_used_qxt ?? 0;

  return {
    plan: raw.plan_name ?? "free",
    status: raw.subscription_status ?? "free",
    balance: raw.qxt_balance ?? 0,
    fairUseLimit,
    monthlyUsed,
    renewalDate: raw.renewal_date ?? null,
    daysRemaining: raw.days_remaining ?? 0,
    isLocked: raw.is_locked ?? false,
    lockReason: raw.lock_reason ?? null,
    isNearLimit: fairUseLimit > 0 && monthlyUsed / fairUseLimit > 0.8,
  };
}

// ─── API Key ──────────────────────────────────────────────────────────────────

export function mapApiKeyFromList(items: RawApiKey[]): string | null {
  const first = items.find((k) => k?.key || k?.value || k?.api_key_value) ?? null;
  const key = first?.key || first?.value || first?.api_key_value || null;
  return key ? String(key) : null;
}