"use client";

import { Crown, AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { qxtApiClient } from "../../lib/api/core/qxtClient";

export default function PaywallLayer() {
  const { isLocked, lockReason, daysRemaining } = useApp();

  async function handleUpgrade() {
    try {
      const res = await qxtApiClient.post(
        "/api/v1/billing/subscribe",
        { plan_id: 1 } // 👈 غيره للـ ID الحقيقي
      );

      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      console.error("Upgrade failed", err);
    }
  }

  if (!isLocked) return null;

  const isSubscriptionInactive =
    lockReason === "subscription_inactive";

  const isLimitReached =
    lockReason === "monthly_limit_reached";

  let title = "";
  let subtitle = "";

  if (isSubscriptionInactive) {
    title = "Subscription Inactive";
    subtitle =
      "Your subscription is not active. Please renew to continue.";
  } else if (isLimitReached) {
    title = "Monthly Limit Reached";
    subtitle =
      "You've reached your monthly QXT usage limit.";
  } else {
    title = "Access Restricted";
    subtitle =
      "Please upgrade your plan to continue.";
  }

  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center">
      <div className="bg-[#0b1117] border border-emerald-900/60 p-8 rounded-2xl text-center space-y-5 max-w-sm w-full shadow-[0_0_40px_rgba(0,0,0,0.6)]">

        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            {isSubscriptionInactive ? (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            ) : (
              <Crown className="w-6 h-6 text-emerald-400" />
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold">{title}</h3>

        <p className="text-sm text-slate-400">
          {subtitle}
        </p>

        {isLimitReached && daysRemaining > 0 && (
          <p className="text-xs text-emerald-400">
            Renews in {daysRemaining} days
          </p>
        )}

        <button
          onClick={handleUpgrade}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-900 font-semibold hover:brightness-110 transition"
        >
          <Crown className="w-4 h-4" />
          Upgrade Plan
        </button>
      </div>
    </div>
  );
}