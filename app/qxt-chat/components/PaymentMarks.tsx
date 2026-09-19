"use client";

import React from "react";

// ✅ Shared across PersonalUpgradeModal, WorkspaceUpgradeModal, and
// AddOnsModal — simplified geometric recreations (not the official
// brand asset files) used the way any checkout page nominatively
// displays accepted payment methods. Swap these for the real
// Visa/Mastercard/Amex/PayPal/Apple Pay/Google Pay logo files
// whenever they're available. PayPal/Apple Pay/Google Pay are wired
// on the backend (2Checkout) but pending final wiring/activation —
// shown here ahead of that going live.

export function VisaMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] bg-white">
      <span className="text-[10px] font-black italic tracking-tighter text-[#1a1f71]">VISA</span>
    </div>
  );
}

export function MastercardMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] bg-white">
      <div className="flex items-center">
        <div className="h-3.5 w-3.5 rounded-full bg-[#eb001b]" />
        <div className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#f79e1b] opacity-90 mix-blend-multiply" />
      </div>
    </div>
  );
}

export function AmexMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] bg-[#2E77BC]">
      <span className="text-[8px] font-black tracking-tight text-white">AMEX</span>
    </div>
  );
}

export function PayPalMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] bg-white">
      <span className="text-[9px] font-black italic tracking-tighter text-[#003087]">
        Pay<span className="text-[#009cde]">Pal</span>
      </span>
    </div>
  );
}

export function ApplePayMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] bg-black">
      <span className="text-[9px] font-semibold tracking-tight text-white"> Pay</span>
    </div>
  );
}

export function GooglePayMark() {
  return (
    <div className="flex h-6 w-9 items-center justify-center rounded-[4px] border border-black/10 bg-white">
      <span className="text-[8px] font-medium tracking-tight text-[#5F6368]">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#EA4335]">P</span>ay
      </span>
    </div>
  );
}

export function PaymentMarksRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <VisaMark />
      <MastercardMark />
      <AmexMark />
      <PayPalMark />
      <ApplePayMark />
      <GooglePayMark />
    </div>
  );
}
