"use client";

import { memo } from "react";

export type AIStage =
  | "thinking"
  | "analyzing"
  | "searching"
  | "generating"
  | "writing";

interface AIStatusProps {
  stage: AIStage;
  history?: AIStage[];
}

const stageLabel: Record<AIStage, string> = {
  thinking:   "Thinking",
  analyzing:  "Analyzing",
  searching:  "Searching",
  generating: "Generating",
  writing:    "Writing",
};

// ─── Orb animation (ChatGPT/Claude style) ────────────────────────────────────

const ThinkingOrb = memo(() => (
  <div className="flex items-center gap-[5px]">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="rounded-full"
        style={{
          width:  "6px",
          height: "6px",
          background: "rgba(255,255,255,0.55)",
          animation: "qxt-orb 1.6s ease-in-out infinite",
          animationDelay: `${i * 0.22}s`,
        }}
      />
    ))}
  </div>
));
ThinkingOrb.displayName = "ThinkingOrb";

// ─── Check icon ───────────────────────────────────────────────────────────────

const Check = memo(() => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
    <path
      d="M1.5 5.5l3 3 5-5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));
Check.displayName = "Check";

// ─── Component ────────────────────────────────────────────────────────────────

export const AIStatus = memo(function AIStatus({
  stage,
  history = [],
}: AIStatusProps) {
  return (
    <div className="flex flex-col gap-2 py-0.5 select-none">

      {/* ── Completed stages ── */}
      {history.slice(-3).map((s) => (
        <div
          key={s}
          className="flex items-center gap-2 text-white/25 text-[13px]"
        >
          <Check />
          <span>{stageLabel[s]}</span>
        </div>
      ))}

      {/* ── Active stage ── */}
      <div className="flex items-center gap-2.5 text-white/75 text-[13px] font-normal">
        <ThinkingOrb />
        <span>{stageLabel[stage]}</span>
      </div>

    </div>
  );
});

AIStatus.displayName = "AIStatus";