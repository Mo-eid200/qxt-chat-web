"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, Loader2, Sparkles, X, ArrowDownCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { getPlans } from "@/app/lib/api/console/billing";

/* =========================================================
   TYPES
========================================================= */

interface BillingPlan {
  id: number;
  name: string;
  plan_type: string;
  monthly_price?: number;
  yearly_price?: number;
  monthly_credits?: number;
  seat_limit?: number;
  storage_gb?: number;
  has_api?: boolean;
  has_priority_queue?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgrade: (planId: number, billing: "monthly" | "yearly") => Promise<void> | void;
  currentPlanId?: number;
}

/* =========================================================
   HELPERS
========================================================= */

function formatPrice(value?: number) {
  return Number(value || 0).toLocaleString();
}

/* =========================================================
   COMPONENT
========================================================= */

export function PersonalUpgradeModal({ open, onClose, onUpgrade, currentPlanId }: Props): React.ReactNode {

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  // Same queryKey as WorkspaceUpgradeModal on purpose — getPlans()
  // returns the full plan list (personal + workspace + company) in
  // both places, each modal just filters it differently below. Same
  // key = shared cache = opening either modal within the staleTime
  // window doesn't trigger a second network call.
  const { data: plansData, isLoading: loadingPlans } = useQuery<BillingPlan[]>({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const data = await getPlans();
      return data as unknown as BillingPlan[];
    },
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    enabled: open,
  });

  const plans = plansData ?? [];

  /* ESC CLOSE */
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  /* RESET ON OPEN */
  useEffect(() => {
    if (open) setSelectedId(null);
  }, [open]);

  /* FILTERED — personal plans only, ever */
  const filteredPlans = useMemo(() => {
    let list = plans
      .filter((plan) => plan.plan_type === "personal")
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

  const selectedPlan = filteredPlans.find((plan) => plan.id === selectedId);
  const currentPlan = filteredPlans.find((plan) => plan.id === currentPlanId);
  const isEnterprise = selectedPlan?.name.toLowerCase() === "enterprise";

  function getPrice(plan: BillingPlan) {
    return billingCycle === "yearly" ? plan.yearly_price ?? plan.monthly_price ?? 0 : plan.monthly_price ?? 0;
  }

  const planDirection: "upgrade" | "downgrade" | "switch" = (() => {
    if (!selectedPlan || !currentPlan) return "switch";
    const currentPrice = getPrice(currentPlan);
    const newPrice = getPrice(selectedPlan);
    if (newPrice > currentPrice) return "upgrade";
    if (newPrice < currentPrice) return "downgrade";
    return "switch";
  })();

  const isDowngrade = planDirection === "downgrade";

  async function handleSubmit() {
    if (!selectedPlan || loading) return;

    if (selectedPlan.name.toLowerCase() === "enterprise") {
      window.location.href = "/contact";
      return;
    }

    try {
      setLoading(true);
      await onUpgrade(selectedPlan.id, billingCycle);
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
            className="relative w-full max-w-[1180px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#071019]/98 shadow-[0_40px_120px_rgba(0,0,0,0.75)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_34%)]" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-all duration-200 hover:bg-white/[0.08] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* HEADER */}
            <div className="border-b border-white/[0.06] px-6 pt-4 pb-5">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-[64px] w-[64px] shrink-0">
                    <Image src="/oqc-logo.png" alt="OpenQCore" fill priority sizes="48px" className="object-contain" />
                  </div>
                  <div>
                    <h2 className="text-[24px] font-semibold tracking-tight text-white">Upgrade your plan</h2>
                    <p className="mt-1 text-[13px] text-white/45">Personal AI access for your own use.</p>
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto pr-12 lg:pr-16">
                  <div className="flex items-center gap-3 text-sm text-white/55">
                    <AnimatePresence>
                      {billingCycle === "yearly" && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="flex items-center gap-1 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-2.5 py-1 text-[11px] font-medium text-[#f5d97b]"
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
                        className={`absolute top-1 w-5 h-5 rounded-full bg-[#d4af37] ${billingCycle === "yearly" ? "left-6" : "left-1"}`}
                      />
                    </button>
                    <span>Yearly</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT */}
            <div className="px-4 lg:px-6 py-5">
              {loadingPlans ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-7 h-7 animate-spin text-[#d4af37]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {filteredPlans.map((plan, idx) => {
                    const active = selectedId === plan.id;
                    const isCurrent = currentPlanId === plan.id;
                    const enterprise = plan.name.toLowerCase() === "enterprise";
                    const isPopular = idx === 2;

                    return (
                      <motion.div
                        key={plan.id}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => setSelectedId(plan.id)}
                        className={`relative cursor-pointer rounded-[24px] border transition-all duration-200 ${
                          active ? "border-[#d4af37]/35 bg-[#0c1520]" : "border-white/[0.06] bg-[#0a111a]"
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5d97b]">
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
                            <h3 className="text-[22px] font-semibold text-white">{plan.name}</h3>
                            <p className="mt-1 text-sm text-white/45">Advanced personal AI access</p>
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
                                <span className="mb-1 text-sm text-white/40">/{billingCycle === "yearly" ? "yr" : "mo"}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-8">
                            <ul className="space-y-3">
                              {enterprise ? (
                                ["Dedicated infrastructure", "Custom AI deployment", "Dedicated support team"].map(
                                  (item) => (
                                    <li key={item} className="flex items-start gap-2 text-sm text-white/75">
                                      <Check className="w-4 h-4 text-emerald-400 mt-0.5" />
                                      {item}
                                    </li>
                                  )
                                )
                              ) : (
                                <>
                                  <li className="flex items-center gap-2 text-sm text-white/75">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    <span className="font-medium">{formatPrice(plan.monthly_credits ?? 0)}</span>
                                    <div className="relative w-4 h-4">
                                      <Image src="/QX-Power.png" alt="QX" fill className="object-contain" />
                                    </div>
                                    QX-Power
                                  </li>
                                  <li className="flex items-center gap-2 text-sm text-white/75">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    Up to {plan.seat_limit} User
                                  </li>
                                  <li className="flex items-center gap-2 text-sm text-white/75">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    {plan.storage_gb}GB Storage
                                  </li>
                                  {plan.has_api && (
                                    <li className="flex items-center gap-2 text-sm text-[#d4af37]">
                                      <Check className="w-4 h-4 text-[#d4af37]" />
                                      API Access
                                    </li>
                                  )}
                                  {plan.has_priority_queue && (
                                    <li className="flex items-center gap-2 text-sm text-[#f5d97b]">
                                      <Check className="w-4 h-4 text-[#f5d97b]" />
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

            {/* FOOTER */}
            <div className="border-t border-white/[0.06] bg-[#071019]/95 backdrop-blur-xl px-6 lg:px-8 py-5">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-white/45">© OpenQCore AI 2026</div>
                  {isDowngrade && selectedPlan?.id !== currentPlanId && (
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-300/80">
                      <ArrowDownCircle className="w-3 h-3" />
                      You'll keep {currentPlan?.name}'s features until your next renewal
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || selectedPlan?.id === currentPlanId || selectedPlan?.monthly_price === 0}
                  className={`inline-flex items-center justify-center gap-2 h-12 min-w-[220px] rounded-2xl px-6 text-sm font-semibold transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
                    isDowngrade ? "bg-white/10 text-white border border-white/15" : "bg-[#d4af37] text-black"
                  }`}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedPlan?.id === currentPlanId
                    ? "Current Plan"
                    : selectedPlan?.monthly_price === 0
                    ? "Free Plan"
                    : isEnterprise
                    ? "Contact Sales"
                    : isDowngrade
                    ? "Downgrade Plan"
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