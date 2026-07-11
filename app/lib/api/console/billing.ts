import { qxtApiClient } from "../core/qxtClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Plan {
  id:                        number;
  name:                      string;
  plan_type:                 string;
  monthly_credits:           number | null;
  seat_limit:                number | null;
  storage_gb:                number | null;
  has_api:                   boolean;
  has_priority_queue:        boolean;
  base_multiplier:           number;
  monthly_price:             number | null;
  monthly_stripe_price_id:   string | null;
  yearly_price:              number | null;
  yearly_stripe_price_id:    string | null;
}

export interface WalletInfo {
  balance: number;
  currency: string;

  added: number;
  consumed: number;
  remaining: number;

  monthly_credits: number;

  usage_percent: number;

  period_start: string | null;

  tokens_used: number;
}

export interface Transaction {
  id:               string;
  amount:           number;
  transaction_type: string;
  reference_id:     string;
  created_at:       string;
}

export interface PaymentMethod {
  id:         string;
  brand:      string;
  last4:      string;
  exp_month:  number;
  exp_year:   number;
  is_default: boolean;
  created_at: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getPlans(): Promise<Plan[]> {
  const { data } = await qxtApiClient.get("/api/v1/billing/plans");
  return data.plans || [];
}

export async function getWallet(targetType = "user", workspaceId?: number): Promise<WalletInfo> {
  const { data } = await qxtApiClient.get("/api/v1/billing/wallet", {
    params: { target_type: targetType, ...(workspaceId ? { workspace_id: workspaceId } : {}) },
  });
  return data;
}

export async function getTransactions(targetType = "user", workspaceId?: number, limit = 20): Promise<Transaction[]> {
  const { data } = await qxtApiClient.get("/api/v1/billing/transactions", {
    params: { target_type: targetType, limit, ...(workspaceId ? { workspace_id: workspaceId } : {}) },
  });
  return data.transactions || [];
}

// ─── Checkout ────────────────────────────────────────────────────────────────
//
// 🔥 FIX: createCheckout() can now come back as a SCHEDULED downgrade
// instead of a real checkout_url — billing_router.py's create_checkout()
// returns { scheduled: true, checkout_url: null, ... } when the
// requested plan is cheaper than the current one, rather than
// charging anything. The return type now reflects both shapes; the
// caller (UpgradeModal's onUpgrade handler) should check `scheduled`
// before redirecting to checkout_url.

export interface CheckoutResult {
  scheduled: boolean;
  checkout_url: string | null;
  session_id: string | null;
  scheduled_plan_id?: number;
  scheduled_change_at?: string | null;
  message?: string;
}

export async function createCheckout(
  planId: number,
  billingCycle: "monthly" | "yearly" = "monthly",
  targetType = "user",
  workspaceId?: string,
): Promise<CheckoutResult> {
  const { data } = await qxtApiClient.post("/api/v1/billing/checkout", {
    plan_id:       planId,
    billing_cycle: billingCycle,
    target_type:   targetType,
    workspace_id:  workspaceId || null,
  });
  return data;
}

// ─── Subscription ────────────────────────────────────────────────────────────
//
// 🔥 FIX: was missing scheduled_plan_name / scheduled_change_at —
// the backend's GET /billing/subscription now returns these (see
// SubscriptionService.get_active()'s LEFT JOIN on the scheduled
// plan), but nothing on the frontend could see them without this.

export interface Subscription {
  has_subscription:     boolean;
  plan_name:             string;
  plan_id?:              number;
  monthly_credits:       number;
  billing_cycle:         string | null;
  status:                string;
  renews_at:             string | null;
  scheduled_plan_name?:  string | null;
  scheduled_change_at?:  string | null;
}

export async function getSubscription(targetType = "user"): Promise<Subscription> {
  const { data } = await qxtApiClient.get("/api/v1/billing/subscription", {
    params: { target_type: targetType },
  });
  return data;
}

// ─── Payment Methods ─────────────────────────────────────────────────────────

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await qxtApiClient.get("/api/v1/billing/payment-methods");
  return data.methods || [];
}

export async function setDefaultPaymentMethod(pmId: string): Promise<void> {
  await qxtApiClient.post(`/api/v1/billing/payment-methods/${pmId}/default`);
}

export async function removePaymentMethod(pmId: string): Promise<void> {
  await qxtApiClient.delete(`/api/v1/billing/payment-methods/${pmId}`);
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id:          string;
  amount:      number;
  currency:    string;
  status:      string;
  created_at:  string;
  pdf_url:     string | null;
  hosted_url:  string | null;
}

export async function getInvoices(): Promise<InvoiceItem[]> {
  const { data } = await qxtApiClient.get("/api/v1/billing/invoices");
  return data.invoices || [];
}

// ─── Cancel / Undo ───────────────────────────────────────────────────────────

export async function cancelSubscription(targetType = "user"): Promise<void> {
  await qxtApiClient.post("/api/v1/billing/cancel", { target_type: targetType });
}

// 🔥 NEW — matches billing_router.py's POST /billing/cancel/undo.
// Lets the customer reverse a pending cancellation before the period
// actually lapses.
export async function undoCancelSubscription(targetType = "user"): Promise<void> {
  await qxtApiClient.post("/api/v1/billing/cancel/undo", { target_type: targetType });
}

// 🔥 NEW — matches billing_router.py's POST /billing/downgrade/undo.
// Lets the customer cancel a pending scheduled downgrade and stay on
// their current plan.
export async function undoScheduledDowngrade(targetType = "user"): Promise<void> {
  await qxtApiClient.post("/api/v1/billing/downgrade/undo", { target_type: targetType });
}

export async function addPaymentMethod(): Promise<{ checkout_url: string }> {
  const { data } = await qxtApiClient.post("/api/v1/billing/payment-methods/add");
  return data;
}

// ─── Console Billing Dashboard ─────────────────────────────────────────────

export interface ConsoleBillingResponse {
  wallet: WalletInfo;

  subscription: Subscription;

  plans: Plan[];

  transactions: Transaction[];

  payment_methods: PaymentMethod[];

  invoices: InvoiceItem[];
}

export async function getConsoleBilling(): Promise<ConsoleBillingResponse> {
  const { data } = await qxtApiClient.get(
    "/api/v1/console/billing"
  );

  return data;
}