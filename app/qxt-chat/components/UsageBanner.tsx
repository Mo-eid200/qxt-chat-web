"use client";

import React, { useEffect, useState } from "react";
import { X, Zap, ArrowUpCircle, PlusCircle } from "lucide-react";

type Props = {
  percentageUsed: number;
  usageTier: string;
  darkMode: boolean;
  onUpgradeClick: () => void;
  onAddOnsClick: () => void;
};

// ✅ Same 8-tier ladder as the backend's _USAGE_TIERS (bootstrap.py) —
// keep this list in sync if thresholds ever change there.
const TIER_ORDER = ["normal", "notice", "low", "moderate", "elevated", "high", "critical", "severe", "exhausted"];

// ✅ Gradient colors progressing from a calm blue/gray at low usage
// to a warning red at exhaustion — smooth, modern gradient rather
// than a flat single color per tier.
const TIER_STYLES: Record<string, { text: string; bar: string; dot: string }> = {
  notice:    { text: "text-blue-300",   bar: "from-blue-500 to-cyan-400",       dot: "bg-blue-400" },
  low:       { text: "text-cyan-300",   bar: "from-cyan-500 to-emerald-400",    dot: "bg-cyan-400" },
  moderate:  { text: "text-amber-300",  bar: "from-emerald-500 to-amber-400",   dot: "bg-amber-400" },
  elevated:  { text: "text-amber-300",  bar: "from-amber-500 to-orange-400",    dot: "bg-amber-400" },
  high:      { text: "text-orange-300", bar: "from-orange-500 to-orange-600",   dot: "bg-orange-400" },
  critical:  { text: "text-red-300",    bar: "from-orange-500 to-red-500",      dot: "bg-red-400" },
  severe:    { text: "text-red-300",    bar: "from-red-500 to-red-600",         dot: "bg-red-500" },
  exhausted: { text: "text-red-200",    bar: "from-red-600 to-red-700",         dot: "bg-red-500" },
};

const DISMISS_STORAGE_KEY = "qxt_usage_banner_dismissed_tier";

export function UsageBanner({ percentageUsed, usageTier, darkMode, onUpgradeClick, onAddOnsClick }: Props) {
  // ✅ Dismissal is tier-scoped AND persisted across refreshes via
  // localStorage — a user who closes the banner at "moderate" (70%)
  // shouldn't see it pop back up on every page reload while still
  // at that same tier (that'd feel like the dismiss button doesn't
  // work). It still reappears once usage climbs into a HIGHER tier
  // (e.g. "elevated" 80%), since that's new, more urgent information.
  const [dismissedTier, setDismissedTierState] = useState<string | null>(null);

  useEffect(() => {
    // Read the persisted dismissal once on mount (client-only, since
    // localStorage isn't available during SSR).
    try {
      const stored = window.localStorage.getItem(DISMISS_STORAGE_KEY);
      if (stored) setDismissedTierState(stored);
    } catch {
      // localStorage unavailable (private browsing, etc.) — banner
      // just won't persist dismissal across reloads, no crash.
    }
  }, []);

  const setDismissedTier = (tier: string) => {
    setDismissedTierState(tier);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, tier);
    } catch {
      // ignore — see above
    }
  };

  useEffect(() => {
    // Any tier change (up OR down) clears a stale dismissal — e.g. a
    // renewal resetting usage back down should also reset dismissal.
    if (dismissedTier && dismissedTier !== usageTier) {
      setDismissedTierState(null);
      try {
        window.localStorage.removeItem(DISMISS_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [usageTier, dismissedTier]);

  const isVisible = usageTier !== "normal" && dismissedTier !== usageTier;
  const style = TIER_STYLES[usageTier] || TIER_STYLES.notice;
  const isExhausted = usageTier === "exhausted";

  if (!isVisible) return null;

  return (
    <div
      className={`
        relative w-full overflow-hidden rounded-xl border mb-2
        animate-in zoom-in-95 fade-in slide-in-from-bottom-1
        [animation-duration:400ms] [animation-timing-function:cubic-bezier(0.16,1,0.3,1)]
        ${darkMode ? "bg-[#0d1117] border-white/[0.08]" : "bg-white border-black/[0.08]"}
      `}
    >
      {/* Gradient progress strip along the top edge */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${style.bar}`} />

      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot} animate-pulse`} />

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <Zap className={`w-3.5 h-3.5 shrink-0 ${style.text}`} />
          <span className={`font-serif text-[13px] font-medium ${style.text}`}>
            Q-Power: {percentageUsed}% used
          </span>

          {isExhausted && (
            <div className="flex items-center gap-2 ml-1">
              <button
                onClick={onUpgradeClick}
                className={`
                  inline-flex items-center gap-1 text-[12px] font-serif font-semibold
                  px-2.5 py-1 rounded-lg transition-colors duration-150
                  ${darkMode ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/10 hover:bg-black/15 text-black"}
                `}
              >
                <ArrowUpCircle className="w-3 h-3" />
                Upgrade Plan
              </button>
              <button
                onClick={onAddOnsClick}
                className={`
                  inline-flex items-center gap-1 text-[12px] font-serif font-semibold
                  px-2.5 py-1 rounded-lg transition-colors duration-150
                  ${darkMode ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/10 hover:bg-black/15 text-black"}
                `}
              >
                <PlusCircle className="w-3 h-3" />
                Add-ons
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setDismissedTier(usageTier)}
          className={`h-6 w-6 shrink-0 rounded-lg flex items-center justify-center transition-colors duration-150 ${
            darkMode ? "hover:bg-white/10 text-white/40 hover:text-white/70" : "hover:bg-black/10 text-black/40 hover:text-black/70"
          }`}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

UsageBanner.displayName = "UsageBanner";
