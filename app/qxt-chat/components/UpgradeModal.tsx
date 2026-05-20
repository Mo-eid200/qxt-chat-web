"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Check,
  Building2,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface Plan {
  id: number;
  name: string;
  monthly_price?: number;
  yearly_price?: number;
  currency: string;

  monthly_credits: number;
  fair_use_qxt: number;

  base_multiplier: number;

  plan_type: "personal" | "workspace" | "company";

  seat_limit: number;
  storage_gb: number;

  has_api: boolean;
  has_priority_queue: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;

  onUpgrade: (
    planId: number,
    billing: "monthly" | "yearly"
  ) => Promise<void> | void;

  currentPlanId?: number;

  isCompanyAccount?: boolean;

  lang?: "en" | "ar";
}

export function UpgradeModal({
  open,
  onClose,
  onUpgrade,
  currentPlanId,
  isCompanyAccount = false,
}: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [accountType, setAccountType] =
    useState<"personal" | "workspace">(
      "personal"
    );

  const [billingCycle, setBillingCycle] =
    useState<"monthly" | "yearly">(
      "monthly"
    );

  const [loading, setLoading] =
    useState(false);

  const [showWorkspaceModal, setShowWorkspaceModal] =
    useState(false);

  // =========================================================
  // LOAD PLANS
  // =========================================================

  useEffect(() => {
    if (!open) return;

    async function loadPlans() {
      try {
        const base =
          process.env
            .NEXT_PUBLIC_QXT_API_BASE_URL ||
          "http://127.0.0.1:8000";

        const res = await fetch(
          `${base}/api/v1/billing/plans`,
          {
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new Error(
            "Failed to load plans"
          );
        }

        const data = await res.json();

        setPlans(data?.data ?? []);
      } catch (err) {
        console.error(
          "Failed loading plans",
          err
        );
      }
    }

    loadPlans();
  }, [open]);

  // =========================================================
  // FILTERED
  // =========================================================

  const filtered = useMemo(() => {
    let list = plans
      .filter((p) =>
        accountType === "workspace"
          ? p.plan_type === "workspace" ||
          p.plan_type === "company"
          : p.plan_type === "personal"
      )
      .sort(
        (a, b) =>
          (a.monthly_price ?? 0) -
          (b.monthly_price ?? 0)
      );

    const enterprise = list.find(
      (p) =>
        p.name.toLowerCase() ===
        "enterprise"
    );

    if (enterprise) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase() !==
          "enterprise"
      );

      list.push(enterprise);
    }

    return list;
  }, [plans, accountType]);

  // =========================================================
  // DEFAULT SELECT
  // =========================================================

  useEffect(() => {
    if (!filtered.length) return;

    setSelectedId(filtered[0].id);
  }, [filtered]);

  if (!open) return null;

  const selected = filtered.find(
    (p) => p.id === selectedId
  );

  const isEnterprise =
    selected?.name.toLowerCase() ===
    "enterprise";

  const isWorkspaceFlow =
    selected?.plan_type ===
    "workspace" ||
    selected?.plan_type === "company";

  function getPrice(plan: Plan) {
    if (billingCycle === "yearly") {
      return (
        plan.yearly_price ??
        plan.monthly_price ??
        0
      );
    }

    return plan.monthly_price ?? 0;
  }

  async function handleMainButton() {
    if (!selected) return;

    if (isEnterprise) {
      window.location.href =
        "/contact";
      return;
    }

    try {
      setLoading(true);

      await onUpgrade(
        selected.id,
        billingCycle
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="
        fixed inset-0 z-[300]
        flex items-center justify-center
        bg-black/80 backdrop-blur-xl
        p-3
      "
        onClick={onClose}
      >
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.96,
            y: 20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.96,
            y: 20,
          }}
          transition={{
            duration: 0.22,
          }}
          onClick={(e) =>
            e.stopPropagation()
          }
          className="
          relative
          w-full
          max-w-[1180px]
          rounded-[28px]
          border border-white/10
          bg-[#07090d]/95
          shadow-[0_20px_80px_rgba(0,0,0,0.65)]
          overflow-hidden
        "
        >
          {/* BACKGROUND */}
          <div
            className="
            absolute inset-0
            bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_32%)]
            pointer-events-none
          "
          />

          {/* CLOSE */}
          <button
            onClick={onClose}
            className="
    absolute
    top-4
    right-4

    lg:top-6
    lg:right-6

    z-[60]

    w-10
    h-10

    rounded-full
    border border-white/10

    bg-black/60
    backdrop-blur-xl

    hover:bg-white/10
    hover:border-white/20

    transition-all duration-200

    flex items-center justify-center

    shadow-[0_4px_20px_rgba(0,0,0,0.35)]
  "
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          {/* HEADER */}
          <div
            className="
            px-6 lg:px-8
            pt-6 pb-5
            border-b border-white/10
          "
          >
            <div
              className="
              flex flex-col lg:flex-row
              items-start lg:items-center
              justify-between
              gap-5
            "
            >
              {/* LEFT */}
              <div className="flex items-center gap-4">
                <div
                  className="
      relative
      h-[64px] w-[64px]
      shrink-0
    "
                >
                  <Image
                    src="/OpenQCore.png"
                    alt="OpenQCore"
                    fill
                    priority
                    sizes="64px"
                    className="object-contain"
                  />
                </div>

                <div>
                  <h2
                    className="
        text-[24px]
        font-semibold
        tracking-tight
        text-white
      "
                  >
                    OpenQCore AI
                  </h2>

                  <p
                    className="
        mt-1
        text-sm
        text-white/45
      "
                  >
                    AI Infrastructure & Workspace Platform
                  </p>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col items-end gap-3 w-full lg:w-auto pr-14 lg:pr-16">
                {/* TYPE */}
                <div
                  className="
                  flex items-center
                  p-1
                  rounded-xl
                  border border-white/10
                  bg-white/[0.03]
                "
                >
                  {[
                    {
                      key: "personal",
                      label: "Personal",
                    },
                    {
                      key: "workspace",
                      label: "Workspace",
                    },
                  ].map((type) => (
                    <button
                      key={type.key}
                      onClick={() => {
                        if (
                          type.key ===
                          "workspace" &&
                          !isCompanyAccount
                        ) {
                          setShowWorkspaceModal(
                            true
                          );
                          return;
                        }

                        setAccountType(
                          type.key as
                          | "personal"
                          | "workspace"
                        );
                      }}
                      className={`
                        relative
                        px-5 py-2
                        rounded-[10px]
                        text-sm
                        font-medium
                        transition-all
                        ${accountType ===
                          type.key
                          ? "bg-white text-black shadow-lg"
                          : "text-white/60 hover:text-white"
                        }
                      `}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* BILLING */}
                <div
                  className="
                  flex items-center gap-3
                  text-sm text-white/60
                "
                >
                  <AnimatePresence>
                    {billingCycle ===
                      "yearly" && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: 4,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: 4,
                          }}
                          className="
                          px-2.5 py-1
                          rounded-full
                          border border-emerald-500/20
                          bg-emerald-500/10
                          text-emerald-300
                          text-[11px]
                          font-medium
                        "
                        >
                          Save 20%
                        </motion.div>
                      )}
                  </AnimatePresence>

                  <span>Monthly</span>

                  <button
                    onClick={() =>
                      setBillingCycle(
                        billingCycle ===
                          "monthly"
                          ? "yearly"
                          : "monthly"
                      )
                    }
                    className="
                    relative
                    w-12 h-7
                    rounded-full
                    bg-white/10
                    border border-white/10
                  "
                  >
                    <motion.div
                      layout
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      className={`
                        absolute top-1
                        w-5 h-5
                        rounded-full
                        bg-white
                        ${billingCycle ===
                          "yearly"
                          ? "left-6"
                          : "left-1"
                        }
                      `}
                    />
                  </button>

                  <span>Yearly</span>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div
            className="
            px-4 lg:px-6
            py-5
          "
          >
            <div
              className="
              grid
              grid-cols-1
              md:grid-cols-2
              xl:grid-cols-4
              gap-4
            "
            >
              {filtered.map((plan) => {
                const active =
                  plan.id === selectedId;

                const isCurrent =
                  plan.id ===
                  currentPlanId;

                const enterprise =
                  plan.name.toLowerCase() ===
                  "enterprise";

                const isPopular =
                  (accountType ===
                    "personal" &&
                    plan.name.toLowerCase() ===
                    "pro") ||
                  (accountType ===
                    "workspace" &&
                    plan.name.toLowerCase() ===
                    "business");

                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{
                      y: -4,
                    }}
                    onClick={() =>
                      setSelectedId(
                        plan.id
                      )
                    }
                    className={`
                    relative
                    rounded-[24px]
                    p-[1px]
                    cursor-pointer
                    transition-all
                    ${active
                        ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500"
                        : "bg-white/[0.08]"
                      }
                  `}
                  >
                    <div
                      className={`
                      relative
                      h-full
                      min-h-[360px]
                      rounded-[24px]
                      bg-[#0b0f17]
                      border
                      p-5
                      flex flex-col
                      ${active
                          ? "border-cyan-300/20"
                          : "border-white/5"
                        }
                    `}
                    >
                      {/* POPULAR */}
                      {isPopular && (
                        <div
                          className="
                          absolute -top-3 left-4
                          flex items-center gap-1.5
                          px-3 py-1.5
                          rounded-full
                          bg-gradient-to-r from-cyan-500 to-blue-600
                          text-[10px]
                          font-semibold
                          uppercase tracking-[0.18em]
                          text-white
                          shadow-lg
                        "
                        >
                          <Sparkles className="w-3 h-3" />
                          Popular
                        </div>
                      )}

                      {/* CURRENT */}
                      {isCurrent && (
                        <div
                          className="
                          absolute top-4 right-4
                          px-2 py-1
                          rounded-lg
                          bg-emerald-500
                          text-[11px]
                          font-semibold
                          text-black
                        "
                        >
                          Active
                        </div>
                      )}

                      {/* TITLE */}
                      <div>
                        <h3
                          className="
                          text-xl
                          font-semibold
                          text-white
                        "
                        >
                          {plan.name}
                        </h3>

                        <p
                          className="
                          mt-1
                          text-sm
                          text-white/45
                        "
                        >
                          {plan.plan_type ===
                            "personal"
                            ? "Personal AI Access"
                            : "Workspace Collaboration"}
                        </p>
                      </div>

                      {/* PRICE */}
                      {!enterprise ? (
                        <div className="mt-6">
                          <div className="flex items-end gap-1">
                            <span
                              className="
                              text-4xl
                              font-bold
                              tracking-tight
                              text-white
                            "
                            >
                              $
                              {getPrice(
                                plan
                              )}
                            </span>

                            <span
                              className="
                              text-white/40
                              text-sm
                              mb-1
                            "
                            >
                              /
                              {billingCycle ===
                                "yearly"
                                ? "yr"
                                : "mo"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-6">
                          <div className="text-4xl font-bold text-white">
                            Custom
                          </div>

                          <div className="text-sm text-white/45 mt-1">
                            Enterprise-grade infrastructure
                          </div>
                        </div>
                      )}

                      {/* FEATURES */}
                      <div className="mt-6 flex-1">
                        <ul className="space-y-3">
                          {enterprise ? (
                            <>
                              {[
                                "Dedicated Infrastructure",
                                "Unlimited Team Seats",
                                "Custom AI Model Tuning",
                                "Dedicated Success Manager",
                              ].map((item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2 text-sm text-white/80"
                                >
                                  <Check className="w-4 h-4 text-emerald-400 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </>
                          ) : (
                            <>
                              <li className="flex items-center gap-2 text-sm text-white/80">
                                <Check className="w-4 h-4 text-emerald-400" />

                                <span className="font-medium">
                                  {plan.monthly_credits.toLocaleString()}
                                </span>

                                <div className="relative w-4 h-4">
                                  <Image
                                    src="/QX-Power.png"
                                    alt="QX"
                                    fill
                                    className="object-contain"
                                  />
                                </div>

                                QX-Power
                              </li>

                              <li className="flex items-center gap-2 text-sm text-white/80">
                                <Check className="w-4 h-4 text-emerald-400" />
                                Fair Use{" "}
                                {plan.fair_use_qxt.toLocaleString()}
                              </li>

                              <li className="flex items-center gap-2 text-sm text-white/80">
                                <Check className="w-4 h-4 text-emerald-400" />
                                Up to{" "}
                                {plan.seat_limit}{" "}
                                {plan.plan_type !==
                                  "personal"
                                  ? "Seats"
                                  : "User"}
                              </li>

                              <li className="flex items-center gap-2 text-sm text-white/80">
                                <Check className="w-4 h-4 text-emerald-400" />
                                {plan.storage_gb}
                                GB Storage
                              </li>

                              {plan.has_api && (
                                <li className="flex items-center gap-2 text-sm text-cyan-300">
                                  <Check className="w-4 h-4 text-cyan-400" />
                                  API Access
                                </li>
                              )}

                              {plan.has_priority_queue && (
                                <li className="flex items-center gap-2 text-sm text-indigo-300">
                                  <Check className="w-4 h-4 text-indigo-400" />
                                  Priority Queue
                                </li>
                              )}
                            </>
                          )}
                        </ul>
                      </div>

                      {/* CTA */}
                      <button
                        onClick={
                          handleMainButton
                        }
                        disabled={
                          loading ||
                          isCurrent ||
                          plan.monthly_price ===
                          0
                        }
                        className={`
                        mt-6
                        h-11
                        rounded-xl
                        font-semibold
                        text-sm
                        transition-all
                        flex items-center justify-center gap-2
                        ${active
                            ? "bg-white text-black hover:opacity-90"
                            : "bg-white/[0.06] text-white hover:bg-white/[0.1]"
                          }
                        disabled:opacity-40
                        disabled:cursor-not-allowed
                      `}
                      >
                        {isCurrent
                          ? "Current Plan"
                          : plan.monthly_price ===
                            0
                            ? "Free Plan"
                            : loading
                              ? "Redirecting..."
                              : enterprise
                                ? "Contact Sales"
                                : isWorkspaceFlow
                                  ? "Create Workspace"
                                  : "Upgrade"}

                        {!loading &&
                          !isCurrent && (
                            <ChevronRight className="w-4 h-4" />
                          )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* FOOTER */}
          <div
            className="
            px-6 py-4
            border-t border-white/10
            text-center
            text-xs text-white/35
          "
          >
            © OpenQCore AI 2026
          </div>

          {/* WORKSPACE MODAL */}
          <AnimatePresence>
            {showWorkspaceModal && (
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                className="
                absolute inset-0 z-[400]
                flex items-center justify-center
                bg-black/75 backdrop-blur-md
              "
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.95,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    y: 10,
                  }}
                  className="
                  w-full max-w-md
                  mx-4
                  rounded-[28px]
                  border border-cyan-500/10
                  bg-[#0b0f17]
                  p-7
                  shadow-[0_20px_80px_rgba(0,0,0,0.6)]
                "
                >
                  <div
                    className="
                    w-14 h-14
                    rounded-2xl
                    bg-gradient-to-br from-cyan-500/15 to-indigo-500/15
                    border border-cyan-400/10
                    flex items-center justify-center
                    mb-5
                  "
                  >
                    <Building2 className="w-7 h-7 text-cyan-400" />
                  </div>

                  <h3 className="text-2xl font-semibold text-white">
                    Upgrade to Workspace
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-white/60">
                    Create a shared AI workspace for your team with unified billing, shared QX-Power, API access, analytics, and enterprise collaboration tools.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      "Shared Workspace Wallet",
                      "Shared QX-Power Usage",
                      "Team Members & Seats",
                      "Advanced API Access",
                      "Workspace Billing",
                      "Priority Infrastructure",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm text-white/80"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() =>
                        setShowWorkspaceModal(
                          false
                        )
                      }
                      className="
                      flex-1 h-11
                      rounded-xl
                      border border-white/10
                      text-white/70
                      hover:bg-white/[0.05]
                      transition
                    "
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => {
                        setShowWorkspaceModal(
                          false
                        );

                        setAccountType(
                          "workspace"
                        );
                      }}
                      className="
                      flex-1 h-11
                      rounded-xl
                      bg-white
                      text-black
                      font-semibold
                      hover:opacity-90
                      transition
                    "
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence >
  );
}