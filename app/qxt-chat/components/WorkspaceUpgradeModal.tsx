"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, Loader2, Sparkles, X, ArrowDownCircle, Building2, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { getPlans, type Plan as ApiPlan } from "@/app/lib/api/console/billing";

/* =========================================================
   TYPES
========================================================= */

interface Plan extends ApiPlan {
  fair_use_qxt: number;
  currency: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
  plan?: string;
  planId?: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  workspaces: WorkspaceOption[];
  currentPlanId?: number | null;
  onUpgrade: (params: {
    planId: number;
    billing: "monthly" | "yearly";
    workspaceId?: string;
    newWorkspaceName?: string;
  }) => Promise<void> | void;
}

/* =========================================================
   HELPERS
========================================================= */

function formatPrice(value?: number | null) {
  return Number(value || 0).toLocaleString();
}

// Only a plan with an EXPLICIT $0 monthly price displays as "Free" —
// must NOT use `?? 0`, since Enterprise's price is null ("Custom"),
// not zero. Enterprise is also checked by name first as a
// belt-and-suspenders guard against any future pricing edge case.
function displayPlanName(plan: Plan): string {
  if (plan.name.toLowerCase() === "enterprise") return plan.name;
  return (plan.monthly_price ?? 0) === 0 ? "Free" : plan.name;
}

/* =========================================================
   COMPONENT
========================================================= */

export function WorkspaceUpgradeModal({
  open,
  onClose,
  workspaces,
  currentPlanId,
  onUpgrade,
}: Props): React.ReactNode {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  const [targetMode, setTargetMode] = useState<"existing" | "new">(
    workspaces.length > 0 ? "existing" : "new"
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    workspaces[0]?.id ?? null
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const {
    data: plans = [],
    isLoading: loadingPlans,
  } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => getPlans() as Promise<Plan[]>,
    enabled: open,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setTargetMode(workspaces.length > 0 ? "existing" : "new");
      setSelectedWorkspaceId(workspaces[0]?.id ?? null);
      setNewWorkspaceName("");
    }
  }, [open, workspaces]);

  const filteredPlans = useMemo(() => {
    let list = plans
      .filter((plan) => plan.plan_type === "workspace" || plan.plan_type === "company")
      .sort((a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0));

    const enterprisePlan = list.find((plan) => plan.name.toLowerCase() === "enterprise");
    if (enterprisePlan) {
      list = list.filter((plan) => plan.name.toLowerCase() !== "enterprise");
      list.push(enterprisePlan);
    }
    return list;
  }, [plans]);

  useEffect(() => {
    if (filteredPlans.length > 0 && !selectedId) {
      setSelectedId(filteredPlans[0].id);
    }
  }, [filteredPlans, selectedId]);

  if (!open) return null;

  const isTargetingExisting = targetMode === "existing" && !!selectedWorkspaceId;

  // Instant and synchronous — every workspace (including free ones)
  // has a real row in billing_subscriptions from the moment it's
  // created (see WorkspaceService.create()), and bootstrap now joins
  // that in for every workspace. No fetch needed, no loading flash.
  const selectedWorkspace = workspaces.find((ws) => ws.id === selectedWorkspaceId);
  const activeCurrentPlanId = isTargetingExisting
    ? selectedWorkspace?.planId ?? null
    : currentPlanId ?? null;

  const selectedPlan = filteredPlans.find((plan) => plan.id === selectedId);
  const currentPlan = filteredPlans.find((plan) => plan.id === activeCurrentPlanId);
  const isEnterprise = selectedPlan?.name.toLowerCase() === "enterprise";

  function getPrice(plan: Plan) {
    return billingCycle === "yearly" ? plan.yearly_price ?? plan.monthly_price ?? 0 : plan.monthly_price ?? 0;
  }

  const planDirection: "upgrade" | "downgrade" | "switch" = (() => {
    if (!selectedPlan || !currentPlan || !isTargetingExisting) return "upgrade";
    const currentPrice = currentPlan.monthly_price ?? 0;
    const newPrice = getPrice(selectedPlan);
    if (newPrice > currentPrice) return "upgrade";
    if (newPrice < currentPrice) return "downgrade";
    return "switch";
  })();

  const isDowngrade = planDirection === "downgrade";

  const canSubmit =
    !!selectedPlan &&
    !loading &&
    selectedPlan.monthly_price !== 0 &&
    (targetMode === "existing" ? !!selectedWorkspaceId : newWorkspaceName.trim().length > 0) &&
    !(isTargetingExisting && selectedPlan.id === activeCurrentPlanId);

  async function handleSubmit() {
    if (!selectedPlan || loading) return;

    if (selectedPlan.name.toLowerCase() === "enterprise") {
      window.location.href = "/contact";
      return;
    }

    if (!canSubmit) return;

    try {
      setLoading(true);
      await onUpgrade({
        planId: selectedPlan.id,
        billing: billingCycle,
        workspaceId: targetMode === "existing" ? selectedWorkspaceId ?? undefined : undefined,
        newWorkspaceName: targetMode === "new" ? newWorkspaceName.trim() : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-xl p-4"
      >
        <div className="relative min-h-[360px] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[1180px] overflow-hidden rounded-[24px] border border-red-500/[0.12] bg-[#0a0506]/98 shadow-[0_40px_120px_rgba(180,20,20,0.16)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.10),transparent_34%)]" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-all duration-200 hover:bg-white/[0.08] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-white/[0.06] px-6 pt-4 pb-5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-[40px] w-[40px] shrink-0">
                    <Image src="/oqc-logo.png" alt="OpenQCore" fill priority sizes="40px" className="object-contain" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-[20px] font-semibold tracking-tight text-white leading-tight">
                      Upgrade workspace
                    </h2>
                    <p className="text-[12px] text-white/45">Shared billing for your team.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-white/55">
                  <AnimatePresence>
                    {billingCycle === "yearly" && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300"
                      >
                        <Sparkles className="w-3 h-3" />
                        Save 20%
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span>Monthly</span>
                  <button
                    onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                    className="relative w-12 h-7 rounded-full border border-white/10 bg-white/[0.06]"
                  >
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      className={`absolute top-1 w-5 h-5 rounded-full bg-red-500 ${billingCycle === "yearly" ? "left-6" : "left-1"}`}
                    />
                  </button>
                  <span>Yearly</span>
                </div>
              </div>
            </div>

            <div className="px-6 pt-4 pb-1">
              <div className="flex flex-col items-center gap-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                  Which workspace?
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setTargetMode("existing");
                        setSelectedWorkspaceId(ws.id);
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-all ${
                        targetMode === "existing" && selectedWorkspaceId === ws.id
                          ? "border-red-500/40 bg-red-500/10 text-red-200"
                          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      {ws.name}
                      {ws.plan && <span className="text-white/30">· {ws.plan}</span>}
                    </button>
                  ))}

                  <button
                    onClick={() => setTargetMode("new")}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-all ${
                      targetMode === "new"
                        ? "border-red-500/40 bg-red-500/10 text-red-200"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New workspace
                  </button>
                </div>

                <AnimatePresence>
                  {targetMode === "new" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="w-full flex justify-center overflow-hidden"
                    >
                      <div className="relative mt-1 w-full max-w-sm">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input
                          type="text"
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          placeholder="Workspace name — e.g. Acme Corp"
                          autoFocus
                          className="h-10 w-full rounded-xl border border-red-500/20 bg-white/[0.03] pl-10 pr-3.5 text-[13px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-red-500/50 focus:bg-white/[0.05]"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="px-4 lg:px-6 py-5">
              {loadingPlans ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-7 h-7 animate-spin text-red-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {filteredPlans.map((plan, idx) => {
                    const active = selectedId === plan.id;
                    const isCurrent = isTargetingExisting && activeCurrentPlanId === plan.id;
                    const enterprise = plan.name.toLowerCase() === "enterprise";
                    const isPopular = idx === 1;

                    return (
                      <motion.div
                        key={plan.id}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => setSelectedId(plan.id)}
                        className={`relative cursor-pointer rounded-[24px] border transition-all duration-200 ${
                          active ? "border-red-500/35 bg-[#170a0a]" : "border-white/[0.06] bg-[#0a111a]"
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">
                            <Crown className="w-3 h-3" />
                            Popular
                          </div>
                        )}

                        {isCurrent && (
                          <div className="absolute right-6 top-6 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-black">
                            Active
                          </div>
                        )}

                        <div className="p-5">
                          <div className="pt-8">
                            <h3 className="text-[22px] font-semibold text-white">{displayPlanName(plan)}</h3>
                            <p className="mt-1 text-sm text-white/45">Enterprise collaboration infrastructure</p>
                          </div>

                          <div className="mt-8">
                            {enterprise ? (
                              <>
                                <div className="text-4xl font-bold tracking-tight text-white">Custom</div>
                                <div className="mt-2 text-sm text-white/45">Tailored enterprise infrastructure.</div>
                              </>
                            ) : (
                              <div className="flex items-end gap-1">
                                <span className="text-4xl font-bold tracking-tight text-white">
                                  ${formatPrice(getPrice(plan))}
                                </span>
                                <span className="mb-1 text-sm text-white/40">
                                  /{billingCycle === "yearly" ? "yr" : "mo"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-8">
                            <ul className="space-y-3">
                              {enterprise ? (
                                [
                                  "Dedicated infrastructure",
                                  "Unlimited team seats",
                                  "Custom AI deployment",
                                  "Dedicated support team",
                                ].map((item) => (
                                  <li key={item} className="flex items-start gap-2 text-sm text-white/75">
                                    <Check className="w-4 h-4 text-emerald-400 mt-0.5" />
                                    {item}
                                  </li>
                                ))
                              ) : (
                                <>
                                  <li className="flex items-center gap-2 text-sm text-white/75">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    <span className="font-medium">{formatPrice(plan.monthly_credits)}</span>
                                    <div className="relative w-4 h-4">
                                      <Image src="/QX-Power.png" alt="QX" fill className="object-contain" />
                                    </div>
                                    QX-Power
                                  </li>
                                  <li className="flex items-center gap-2 text-sm text-white/75">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    Fair Use {formatPrice(plan.fair_use_qxt)}
                                  </li>
                                  <li className="flex items-center gap-2 text-sm text-white/75">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    Up to {plan.seat_limit} Seats
                                  </li>
                                  <li className="flex items-center gap-2 text-sm text-white/75">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    {plan.storage_gb}GB Storage
                                  </li>
                                  {plan.has_api && (
                                    <li className="flex items-center gap-2 text-sm text-red-300">
                                      <Check className="w-4 h-4 text-red-400" />
                                      API Access
                                    </li>
                                  )}
                                  {plan.has_priority_queue && (
                                    <li className="flex items-center gap-2 text-sm text-red-200">
                                      <Check className="w-4 h-4 text-red-300" />
                                      Priority Queue
                                    </li>
                                  )}
                                </>
                              )}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] bg-[#0a0506]/95 backdrop-blur-xl px-6 lg:px-8 py-5">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-white/45">© OpenQCore AI 2026</div>
                  {isDowngrade && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-300/80">
                      <ArrowDownCircle className="w-3 h-3" />
                      You'll keep {currentPlan?.name}'s features until your next renewal
                    </div>
                  )}
                  {targetMode === "new" && !newWorkspaceName.trim() && (
                    <div className="text-[11px] text-amber-300/80">Enter a workspace name to continue</div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`inline-flex items-center justify-center gap-2 h-12 min-w-[220px] rounded-2xl px-6 text-sm font-semibold transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
                    isDowngrade
                      ? "bg-white/10 text-white border border-white/15"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isTargetingExisting && selectedPlan?.id === activeCurrentPlanId
                    ? "Current Plan"
                    : selectedPlan?.monthly_price === 0
                    ? "Free Plan"
                    : isEnterprise
                    ? "Contact Sales"
                    : isDowngrade
                    ? "Downgrade Plan"
                    : targetMode === "new"
                    ? "Create & Upgrade"
                    : "Upgrade Plan"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}