"use client";

import { memo, useEffect, useState } from "react";
import Lottie from "lottie-react";
import animationData from "@/public/lottie/openqcore-loader.json";

export type AIStage =
  | "thinking"
  | "analyzing"
  | "searching"
  | "generating"
  | "writing";

interface AIStatusProps {
  stage: AIStage;
  /** Optional contextual detail from the backend, e.g. the actual
   * search query or city name -- shown next to the stage label
   * ("Searching — "weather in Durrës""). */
  detail?: string;
}

const stageLabel: Record<AIStage, string> = {
  thinking: "Thinking",
  analyzing: "Analyzing",
  searching: "Searching",
  generating: "Generating",
  writing: "Writing",
};

// ─── Component — ONE LINE ONLY, no history, no stacking ──────────────────────

export const AIStatus = memo(function AIStatus({ stage, detail }: AIStatusProps) {
  const [displayed, setDisplayed] = useState({ stage, detail });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (stage === displayed.stage && detail === displayed.detail) return;
    setVisible(false);
    const t = setTimeout(() => {
      setDisplayed({ stage, detail });
      setVisible(true);
    }, 140);
    return () => clearTimeout(t);
  }, [stage, detail, displayed.stage, displayed.detail]);

  return (
    <div className="flex items-center gap-2.5 py-1.5 select-none">
      <div className="h-12 w-12 shrink-0 -m-2.5">
        <Lottie
          animationData={animationData}
          loop
          autoplay
          rendererSettings={{
            progressiveLoad: false,
            preserveAspectRatio: "xMidYMid meet",
          }}
          style={{ width: 52, height: 52 }}
        />
      </div>

      <span
        className="text-[14px] text-white/70 leading-none transition-opacity duration-150 truncate"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {stageLabel[displayed.stage]}
        {displayed.detail && (
          <span className="text-white/40"> — &ldquo;{displayed.detail}&rdquo;</span>
        )}
      </span>
    </div>
  );
});

AIStatus.displayName = "AIStatus";