"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Zap, ArrowUpCircle, PlusCircle } from "lucide-react";

type Props = {
  percentageUsed: number;
  usageTier: string;
  darkMode: boolean;
  userId: string | number | null | undefined;
  onUpgradeClick: () => void;
  onAddOnsClick: () => void;
};

// ✅ Same 8-tier ladder as the backend's _USAGE_TIERS (bootstrap.py) —
// keep this list in sync if thresholds ever change there.
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

// ✅ Scoped per-user (not just per-browser) — without the user id in
// the key, logging out and into a DIFFERENT account on the same
// browser/device would incorrectly inherit the previous account's
// dismissal, hiding a banner the new account never actually
// dismissed. Same account logging back in still correctly stays
// dismissed, since the key is identical across their own sessions.
function dismissStorageKey(userId: string | number | null | undefined): string {
  return `qxt_usage_banner_dismissed_tier_${userId ?? "anon"}`;
}

// ✅ Single source of truth, matching how large platforms (Claude,
// ChatGPT, Notion) handle "dismiss until state changes" banners:
// one boolean ref for whether THIS SPECIFIC tier was dismissed,
// read/written directly at the moment of the click — no separate
// effects racing to reconcile derived state against each other.
function readDismissedTier(userId: string | number | null | undefined): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(dismissStorageKey(userId));
  } catch {
    return null;
  }
}

function writeDismissedTier(userId: string | number | null | undefined, tier: string | null) {
  try {
    const key = dismissStorageKey(userId);
    if (tier) window.localStorage.setItem(key, tier);
    else window.localStorage.removeItem(key);
  } catch {
    // ignore — private browsing etc.
  }
}

export function UsageBanner({ percentageUsed, usageTier, darkMode, userId, onUpgradeClick, onAddOnsClick }: Props) {
  const isExhausted = usageTier === "exhausted";
  const style = TIER_STYLES[usageTier] || TIER_STYLES.notice;

  // "visible" is the single flag driving both render (mount/unmount)
  // and the animation class — no other state duplicates or races
  // against it.
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHydrated = useRef(false);

  // Recompute visibility whenever the tier changes: a tier the user
  // hasn't dismissed (or a NEW, different tier than whatever they
  // last dismissed) should show; the exact tier they dismissed stays
  // hidden. This one check replaces the previous two interacting
  // effects.
  useEffect(() => {
    hasHydrated.current = true;
    const dismissed = readDismissedTier(userId);
    const shouldBeVisible = usageTier !== "normal" && dismissed !== usageTier;

    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setClosing(false);
    setVisible(shouldBeVisible);
  }, [usageTier, userId]);

  const handleDismiss = () => {
    writeDismissedTier(userId, usageTier);
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 250);
  };

  // Nothing to show before hydration (avoids an SSR/client mismatch
  // flash) or once fully hidden.
  if (!hasHydrated.current || !visible) return null;

  return (
    <div
      className={`
        relative w-full overflow-hidden rounded-xl border mb-2
        [animation-timing-function:cubic-bezier(0.16,1,0.3,1)]
        ${closing
          ? "animate-out zoom-out-95 fade-out slide-out-to-bottom-1 [animation-duration:250ms]"
          : "animate-in zoom-in-95 fade-in slide-in-from-bottom-1 [animation-duration:400ms]"
        }
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
          onClick={handleDismiss}
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
