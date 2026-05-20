"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getVisionTheme } from "./visionTheme";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export function VisionHeader({
  darkMode,
  onBackToChat,
}: {
  darkMode: boolean;
  onBackToChat: () => void;
}) {
  const t = useMemo(() => getVisionTheme(darkMode), [darkMode]);

  return (
    <div className="sticky top-4 z-40 px-3 md:px-4">
      <header
        className={cn(
          // ✅ aligned with main frame
          "mx-auto max-w-[1240px]",
          "rounded-[26px] border overflow-hidden",
          "backdrop-blur-2xl",
          t.border,
          t.headerBar,
          darkMode
            ? "shadow-[0_18px_70px_rgba(0,0,0,0.55)]"
            : "shadow-[0_18px_70px_rgba(15,23,42,0.12)]"
        )}
      >
        {/* top scan line */}
        <div className={cn("h-[2px] w-full", t.headerLine, "animate-irisLine")} />

        {/* inner aurora */}
        <div className={cn("pointer-events-none absolute inset-0", t.headerAura)} />

        {/* subtle sweep */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            "bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.10),transparent)]",
            darkMode ? "opacity-[0.10]" : "opacity-[0.16]",
            "translate-x-[-60%] animate-irisSweep"
          )}
        />

        {/* grain inline (no 404) */}
        <div
          className={cn("pointer-events-none absolute inset-0", t.grainOpacity)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='320' height='320' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
            backgroundSize: "320px 320px",
          }}
        />

        <div className="relative px-4 md:px-6 py-3.5 md:py-4 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-4 min-w-0">
<div className="relative shrink-0">
  {/* aura behind logo */}
  <div
    className={cn(
      "pointer-events-none absolute -inset-6 blur-2xl opacity-80",
      t.irisGlow,
      "animate-irisPulse"
    )}
  />

  {/* free logo (no frame) */}
  <div className="relative h-16 w-16 md:h-20 md:w-20">
    <Image
      src="/QXT-Vision.png"
      alt="QXT Vision"
      fill
      priority
      className="object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
    />
  </div>
</div>



            <div className="min-w-0 leading-tight">
              <div
                className={cn(
                  "text-[15px] md:text-[16px] font-semibold tracking-[-0.02em] truncate",
                  "bg-clip-text text-transparent",
                  darkMode
                      ? "bg-gradient-to-r from-sky-100 via-white to-sky-200"
                      : "bg-gradient-to-r from-slate-900 via-sky-700 to-slate-900"
                )}
              >
                QXT Vision
              </div>
              <div className={cn("text-[11px] md:text-[12px] truncate", t.muted)}>
                Image • Video • OCR • Document Intelligence
              </div>
            </div>
          </div>

          {/* Back */}
          <button
            onClick={onBackToChat}
            type="button"
            className={cn(
              "group relative overflow-hidden",
              "inline-flex items-center gap-2",
              "h-9 md:h-10 px-3.5 md:px-4",
              "rounded-2xl border transition active:scale-[0.98]",
              t.btn
            )}
          >
            <span
              className={cn(
                "pointer-events-none absolute inset-0",
                "bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]",
                "translate-x-[-70%] group-hover:animate-irisBtnSweep",
                darkMode ? "opacity-[0.18]" : "opacity-[0.20]"
              )}
            />
            <ArrowLeft className="w-4 h-4 opacity-90 group-hover:-translate-x-[1px] transition" />
            <span className="text-[11px] md:text-[12px] font-semibold">Back to ChatQXT</span>
            <Sparkles className="w-4 h-4 opacity-60 group-hover:opacity-90 transition" />
          </button>
        </div>
      </header>
    </div>
  );
}
