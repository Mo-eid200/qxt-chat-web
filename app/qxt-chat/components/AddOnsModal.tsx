"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X, Zap, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";
import { getAddonPacks, createAddonCheckout, type AddonPack } from "@/app/lib/api/console/billing";

interface Props {
  open: boolean;
  onClose: () => void;
  targetType?: "user" | "workspace";
  workspaceId?: string;
}

function formatPrice(value: number) {
  return Number(value || 0).toLocaleString();
}

// ✅ Deliberately distinct from PersonalUpgradeModal/WorkspaceUpgradeModal:
// energetic amber→orange power-meter rows instead of the calm gold
// pricing-tier cards, so a "top up my balance" action never looks
// like a "change my subscription" action. Row layout (not a grid of
// equal boxes) with a filled power-bar per pack visually communicates
// relative size at a glance — inspired by in-app currency top-up
// patterns (Discord Nitro Boosts, mobile game credit packs) rather
// than SaaS pricing-tier tables.
const PACK_ICON_INTENSITY = [1, 2, 3, 4]; // bolt count scales with pack size

export function AddOnsModal({ open, onClose, targetType = "user", workspaceId }: Props): React.ReactNode {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: packsData, isLoading: loadingPacks } = useQuery<AddonPack[]>({
    queryKey: ["addon-packs"],
    queryFn: getAddonPacks,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    enabled: open,
  });

  const packs = packsData ?? [];
  const maxUnits = Math.max(...packs.map((p) => p.units), 1);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setSelectedId(null);
  }, [open]);

  useEffect(() => {
    if (packs.length > 0 && !selectedId) {
      // Default to the second-from-last pack (best value sweet spot),
      // matching the "recommended" pattern top-up platforms use.
      const idx = Math.max(0, packs.length - 2);
      setSelectedId(packs[idx]?.id ?? packs[0].id);
    }
  }, [packs, selectedId]);

  if (!open) return null;

  const selectedPack = packs.find((p) => p.id === selectedId);

  async function handlePurchase() {
    if (!selectedPack || loading) return;
    try {
      setLoading(true);
      const result = await createAddonCheckout(selectedPack.id, targetType, workspaceId);
      window.location.href = result.checkout_url;
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
        className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-xl p-4"
      >
        <div className="relative min-h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[640px] overflow-hidden rounded-[24px] border border-amber-500/20 bg-[#0a0704] shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
          >
            {/* Energetic amber/orange radial glow — deliberately warmer
                and more saturated than the gold-tier modal's subtle
                top glow, reinforcing "power/energy" over "premium tier". */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_45%)]" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-all duration-200 hover:bg-white/[0.08] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* HEADER */}
            <div className="relative border-b border-amber-500/[0.12] px-6 pt-6 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-600/20">
                  <Zap className="h-5 w-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <h2 className="font-serif text-[22px] font-bold tracking-tight text-white">Top up Q-Power</h2>
                  <p className="mt-0.5 text-[13px] text-white/40">One-time charge, credited instantly to your balance</p>
                </div>
              </div>
            </div>

            {/* CONTENT — power-meter rows, not equal-width cards */}
            <div className="relative px-4 sm:px-6 py-5">
              {loadingPacks ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {packs.map((pack, idx) => {
                    const active = selectedId === pack.id;
                    const fillPercent = Math.max(18, Math.round((pack.units / maxUnits) * 100));
                    const isBestValue = idx === packs.length - 2 && packs.length > 1;
                    const boltCount = PACK_ICON_INTENSITY[Math.min(idx, PACK_ICON_INTENSITY.length - 1)];

                    return (
                      <motion.button
                        key={pack.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setSelectedId(pack.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
                          active
                            ? "border-amber-400/60 bg-gradient-to-r from-amber-500/[0.12] to-orange-600/[0.06] shadow-[0_0_0_1px_rgba(251,191,36,0.15)]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]"
                        }`}
                      >
                        {/* Filled power-bar background, proportional to pack size */}
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                            active ? "bg-gradient-to-r from-amber-500/[0.08] to-transparent" : "bg-white/[0.015]"
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />

                        <div className="relative flex items-center gap-4 px-4 py-3.5">
                          <div className="flex shrink-0 items-center gap-0.5">
                            {Array.from({ length: boltCount }).map((_, i) => (
                              <Zap
                                key={i}
                                className={`h-3.5 w-3.5 ${active ? "text-amber-400 fill-amber-400" : "text-white/25 fill-white/25"}`}
                              />
                            ))}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-serif text-[15px] font-bold text-white">{pack.name}</span>
                              {isBestValue && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Best value
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[12px] text-white/40">
                              {formatPrice(pack.units)} QX-Power
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-[17px] font-bold text-white">${formatPrice(pack.price)}</div>
                          </div>

                          {/* Selection indicator */}
                          <div
                            className={`h-5 w-5 shrink-0 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                              active ? "border-amber-400 bg-amber-400" : "border-white/20"
                            }`}
                          >
                            {active && <div className="h-2 w-2 rounded-full bg-[#0a0704]" />}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 text-center text-[11px] text-white/30">
                Q-Power from add-ons never expires while your subscription stays active.
              </p>
            </div>

            {/* FOOTER */}
            <div className="relative border-t border-amber-500/[0.12] bg-black/40 backdrop-blur-xl px-6 py-4">
              <button
                onClick={handlePurchase}
                disabled={loading || !selectedPack}
                className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-[15px] font-serif font-bold text-black transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {selectedPack ? `Charge $${formatPrice(selectedPack.price)} now` : "Select a pack"}
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
