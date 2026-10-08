"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { VisionSidebar } from "./components/VisionSidebar";
import { VisionHeader } from "./components/VisionHeader";
import { VisionStudio } from "./components/VisionStudio";
import { getVisionTheme } from "./components/visionTheme";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function QXTVisionPage() {
  return <QXTVisionInner />;
}

function QXTVisionInner() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const theme = useMemo(() => getVisionTheme(darkMode), [darkMode]);

  // ✅ smaller, cleaner shift (prevents "floating misalignment" feeling)
  const contentShift = "";

  // ✅ unified width with header and frame
  const contentWrap = cn("transition-transform duration-300", contentShift);

  return (
    <div className={cn("relative min-h-screen overflow-hidden", theme.root)} dir="ltr">
      {/* Background aurora */}
      <div className={cn("pointer-events-none absolute inset-0 -z-10", theme.aurora)} />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_50%_22%,transparent_42%,rgba(0,0,0,0.62))]" />

      {/* Grain (subtle premium texture) */}
      <div
        className={cn("pointer-events-none absolute inset-0 -z-10", theme.grainOpacity)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='320' height='320' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
          backgroundSize: "320px 320px",
        }}
      />

      <div className={cn("absolute inset-0 flex", theme.text)}>
        {/* Sidebar */}
        <VisionSidebar
          open={sidebarOpen}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode((v) => !v)}
          onToggleOpen={() => setSidebarOpen((v) => !v)}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <VisionHeader darkMode={darkMode} onBackToChat={() => router.push("/qxt-chat")} />

          {/* ✅ header height safe area (no overlap) */}
<main className="flex-1 overflow-y-auto overflow-x-hidden qxt-scroll px-0 py-4 pb-10">
  {/* FULL WIDTH (no useless right gap) */}
  <div className="w-full">
    <div className="rounded-[30px] p-[1px] bg-[linear-gradient(90deg,rgba(77,163,255,0.30),rgba(255,255,255,0.06),rgba(77,163,255,0.16))] shadow-[0_30px_120px_rgba(0,0,0,0.22)]">
      <div className={cn("rounded-[29px] border backdrop-blur-2xl", theme.border, theme.glass)}>
        <div className={cn("p-3 md:p-5", contentWrap)}>
          <VisionStudio darkMode={darkMode} />
        </div>
      </div>
    </div>
  </div>

  {/* Footer */}
  <div className="w-full px-2 pt-6">
    <div className={cn("text-[11px]", theme.muted)}>
      QXT Vision — Iris Engine • Image / Video / OCR • Powered by OpenQCore
    </div>
  </div>
</main>
        </div>
      </div>
    </div>
  );
}
