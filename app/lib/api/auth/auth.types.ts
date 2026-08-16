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

  bootstrap: BootstrapResponse | null;
  authReady: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<LoginResponse>;

  register: (
    email: string,
    password: string
  ) => Promise<RegisterResponse>;

  logout: () => void;

  setAuthFromToken: (
    token: string
  ) => Promise<BootstrapResponse>;

  refreshBootstrap: () => Promise<BootstrapResponse>;
  refreshMeAndKeys: () => Promise<void>;
};

export type LoginResponse = {
  access_token: string | null;
  token_type: string | null;
  mfa_required: boolean;
  challenge_id: string | null;
};

export type RegisterResponse = {
  access_token: string;
  token_type: string;
  context_id: string;
  context_type: "user";
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
/* ─── Application Bootstrap ──────────────────────────────────────────────── */

export type BootstrapWorkspace = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  logo_url?: string | null;
  role: string;
  type?: string | null;
  subscription_status?: string | null;
  plan_id?: number | null;
  plan_name?: string | null;
  seat_limit: number;
  billing_cycle?: string | null;
  renews_at?: string | null;
  wallet_balance: number;
  projects_count: number;
  members_count: number;
  agents_count: number;
  chats_count: number;
  api_requests: number;
  created_at?: string | null;
};

export type BootstrapSubscription = {
  has_subscription: boolean;
  plan_name: string;
  plan_id?: number | null;
  monthly_credits: number;
  billing_cycle?: string | null;
  status: string;
  renews_at?: string | null;
  scheduled_plan_name?: string | null;
  scheduled_change_at?: string | null;
};

export type BootstrapResponse = {
  user: AuthUser;
  workspaces: BootstrapWorkspace[];
  personal_subscription: BootstrapSubscription;
};
