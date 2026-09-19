"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X, Zap } from "lucide-react";
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

// ✅ Same design language as PersonalUpgradeModal/WorkspaceUpgradeModal
// (min-h-full centering, font-serif, gold accent, framer-motion
// zoom/fade) — Add-on packs are shown as cards instead of tiers, no
// billing-cycle toggle (these are one-time purchases, not recurring).
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
      setSelectedId(packs[0].id);
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
        className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-xl p-4"
      >
        <div className="relative min-h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[980px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#071019]/98 shadow-[0_40px_120px_rgba(0,0,0,0.75)]"
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
              <div className="flex items-center gap-4">
                <div className="relative h-[64px] w-[64px] shrink-0">
                  <Image src="/oqc-logo.png" alt="OpenQCore" fill priority sizes="48px" className="object-contain" />
                </div>
                <div>
                  <h2 className="font-serif text-[24px] font-semibold tracking-tight text-white">Top up your Q-Power</h2>
                  <p className="mt-1 text-[13px] text-white/45">One-time purchase, added straight to your balance.</p>
                </div>
              </div>
            </div>

            {/* CONTENT */}
            <div className="px-4 lg:px-6 py-5">
              {loadingPacks ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-7 h-7 animate-spin text-[#d4af37]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {packs.map((pack) => {
                    const active = selectedId === pack.id;
                    return (
                      <motion.div
                        key={pack.id}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => setSelectedId(pack.id)}
                        className={`relative cursor-pointer rounded-[24px] border transition-all duration-200 ${
                          active ? "border-[#d4af37]/35 bg-[#0c1520]" : "border-white/[0.06] bg-[#0a111a]"
                        }`}
                      >
                        <div className="p-5">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-[#d4af37]" />
                            <h3 className="font-serif text-[20px] font-semibold text-white">{pack.name}</h3>
                          </div>

                          <div className="mt-6 flex items-end gap-1">
                            <span className="text-4xl font-bold tracking-tight text-white">
                              ${formatPrice(pack.price)}
                            </span>
                            <span className="mb-1 text-sm text-white/40">one-time</span>
                          </div>

                          <ul className="mt-6 space-y-3">
                            <li className="flex items-center gap-2 text-sm text-white/75">
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span className="font-medium">{formatPrice(pack.units)}</span>
                              <div className="relative w-4 h-4">
                                <Image src="/QX-Power.png" alt="QX" fill className="object-contain" />
                              </div>
                              QX-Power
                            </li>
                            <li className="flex items-center gap-2 text-sm text-white/75">
                              <Check className="w-4 h-4 text-emerald-400" />
                              Never expires while subscribed
                            </li>
                          </ul>
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
                <div className="text-sm text-white/45">© OpenQCore AI 2026</div>

                <button
                  onClick={handlePurchase}
                  disabled={loading || !selectedPack}
                  className="inline-flex items-center justify-center gap-2 h-12 min-w-[220px] rounded-2xl px-6 text-sm font-serif font-semibold bg-[#d4af37] text-black transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedPack ? `Buy ${selectedPack.name} — $${formatPrice(selectedPack.price)}` : "Select a pack"}
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
