// ─── User ─────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id?: number | string;
  email: string;
  full_name?: string | null;
  company_id?: number | null;
  role?: "admin" | "user" | null;
};

// ─── Subscription / Billing ───────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "free";

export type LockReason =
  | "subscription_inactive"
  | "monthly_limit_reached"
  | null;

export interface BillingState {
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
}

// ─── Auth Context Value ───────────────────────────────────────────────────────

export type AuthContextValue = {
  user: AuthUser | null;
  loadingUser: boolean;
  apiKey: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuthFromToken: (token: string) => Promise<void>;
  refreshMeAndKeys: () => Promise<void>;
};

// ─── App Context Value ────────────────────────────────────────────────────────

export interface AppState extends BillingState {
  user: AuthUser | null;
  role: "admin" | "user" | null;
  refresh: () => Promise<void>;
}

// ─── Raw API shapes ───────────────────────────────────────────────────────────

export interface RawBillingResponse {
  plan_name?: string;
  subscription_status?: SubscriptionStatus;
  qxt_balance?: number;
  fair_use_limit?: number;
  monthly_used_qxt?: number;
  renewal_date?: string | null;
  days_remaining?: number;
  is_locked?: boolean;
  lock_reason?: LockReason;
}

export interface RawApiKey {
  key?: string;
  value?: string;
  api_key_value?: string;
}