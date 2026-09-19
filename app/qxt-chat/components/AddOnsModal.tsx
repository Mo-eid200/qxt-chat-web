"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X, Zap } from "lucide-react";
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

// ✅ Small, minimal payment-brand marks — simplified geometric
// recreations (not the official brand files) used the way any
// checkout page nominatively displays accepted payment methods.
// Swap these for the real Visa/Mastercard/Amex asset files whenever
// they're available; these are just placeholders that read clearly
// at 24px.
function VisaMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] bg-white">
      <span className="text-[10px] font-black italic tracking-tighter text-[#1a1f71]">VISA</span>
    </div>
  );
}
function MastercardMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] bg-white">
      <div className="flex items-center">
        <div className="h-3.5 w-3.5 rounded-full bg-[#eb001b]" />
        <div className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#f79e1b] opacity-90 mix-blend-multiply" />
      </div>
    </div>
  );
}
function AmexMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] bg-[#2E77BC]">
      <span className="text-[8px] font-black tracking-tight text-white">AMEX</span>
    </div>
  );
}

// ✅ Compact, minimal, Claude/Linear-style design — small modal
// width, tight vertical rhythm, subdued single-accent color instead
// of the previous large glowing power-bar rows. Distinct from
// PersonalUpgradeModal via a single amber accent color (vs. gold)
// and a simple bordered-list layout rather than a pricing-tier grid.
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
        className="fixed inset-0 z-[9999] overflow-y-auto bg-black/70 backdrop-blur-md p-4"
      >
        <div className="relative min-h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <h2 className="font-serif text-[16px] font-semibold text-white">Top up Q-Power</h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CONTENT — compact list, single accent color */}
            <div className="px-3 pb-3">
              {loadingPacks ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {packs.map((pack) => {
                    const active = selectedId === pack.id;
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setSelectedId(pack.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-150 ${
                          active
                            ? "border-amber-500/40 bg-amber-500/[0.06]"
                            : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                              active ? "border-amber-400 bg-amber-400" : "border-white/15"
                            }`}
                          >
                            {active && <div className="h-full w-full rounded-full border-2 border-[#141414]" />}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-white">{pack.name}</div>
                            <div className="text-[11px] text-white/35">{formatPrice(pack.units)} QX-Power</div>
                          </div>
                        </div>
                        <div className="text-[14px] font-semibold text-white">${formatPrice(pack.price)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="border-t border-white/[0.06] px-5 py-4">
              <button
                onClick={handlePurchase}
                disabled={loading || !selectedPack}
                className="flex w-full items-center justify-center gap-2 h-10 rounded-xl bg-amber-500 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {selectedPack ? `Pay $${formatPrice(selectedPack.price)}` : "Select a pack"}
              </button>

              <div className="mt-3 flex items-center justify-center gap-1.5">
                <VisaMark />
                <MastercardMark />
                <AmexMark />
              </div>

              <p className="mt-2.5 text-center text-[10.5px] text-white/25">
                Never expires while your subscription stays active
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
