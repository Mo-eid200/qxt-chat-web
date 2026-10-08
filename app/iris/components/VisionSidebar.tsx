"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  Sun,
  Moon,
  X,
  Video,
  Images,
  ScanText,
  ShieldCheck,
  History,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getVisionTheme } from "./visionTheme";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

type FolderKey = "images" | "videos" | "ocr" | "reports";
type HistoryItem = { id: string; title: string; time: string };

const SECTION_META: Record<
  FolderKey,
  {
    title: string;
    hint: string;
    icon: React.ComponentType<any>;

    accentDot: string;
    line: string;
    glow: string;

    chip: string;
    badge: string;

    itemTopLine: string;
  }
> = {
  images: {
    title: "Images",
    hint: "Generations & edits",
    icon: Images,
    accentDot: "bg-gradient-to-r from-sky-300 to-indigo-300",
    line: "bg-[linear-gradient(90deg,transparent,rgba(56,189,248,0.70),rgba(99,102,241,0.50),transparent)]",
    glow: "bg-[radial-gradient(140px_circle_at_50%_50%,rgba(56,189,248,0.28),transparent_70%)]",
    chip: "bg-white/[0.04] border-white/10",
    badge: "border-sky-400/25 bg-sky-500/10 text-white/85",
    itemTopLine: "bg-[linear-gradient(90deg,transparent,rgba(56,189,248,0.55),transparent)]",
  },
  videos: {
    title: "Videos",
    hint: "Motion & reels",
    icon: Video,
    accentDot: "bg-gradient-to-r from-fuchsia-300 to-rose-300",
    line: "bg-[linear-gradient(90deg,transparent,rgba(217,70,239,0.70),rgba(244,63,94,0.45),transparent)]",
    glow: "bg-[radial-gradient(140px_circle_at_50%_50%,rgba(217,70,239,0.24),transparent_70%)]",
    chip: "bg-white/[0.04] border-white/10",
    badge: "border-fuchsia-400/25 bg-fuchsia-500/10 text-white/85",
    itemTopLine: "bg-[linear-gradient(90deg,transparent,rgba(217,70,239,0.50),transparent)]",
  },
  ocr: {
    title: "OCR Results",
    hint: "Text extraction",
    icon: ScanText,
    accentDot: "bg-gradient-to-r from-emerald-300 to-teal-300",
    line: "bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.70),rgba(45,212,191,0.45),transparent)]",
    glow: "bg-[radial-gradient(140px_circle_at_50%_50%,rgba(16,185,129,0.22),transparent_70%)]",
    chip: "bg-white/[0.04] border-white/10",
    badge: "border-emerald-400/25 bg-emerald-500/10 text-white/85",
    itemTopLine: "bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.50),transparent)]",
  },
  reports: {
    title: "Reports",
    hint: "Validation & checks",
    icon: ShieldCheck,
    accentDot: "bg-gradient-to-r from-amber-300 to-orange-300",
    line: "bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.70),rgba(249,115,22,0.45),transparent)]",
    glow: "bg-[radial-gradient(140px_circle_at_50%_50%,rgba(251,191,36,0.18),transparent_70%)]",
    chip: "bg-white/[0.04] border-white/10",
    badge: "border-amber-400/25 bg-amber-500/10 text-white/85",
    itemTopLine: "bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.45),transparent)]",
  },
};

export function VisionSidebar({
  open,
  darkMode,
  onToggleTheme,
  onToggleOpen,
  onClose,
}: {
  open: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
  onToggleOpen: () => void;
  onClose: () => void;
}) {
  const theme = useMemo(() => getVisionTheme(darkMode), [darkMode]);

  const [foldersOpen, setFoldersOpen] = useState<Record<FolderKey, boolean>>({
    images: true,
    videos: false,
    ocr: false,
    reports: false,
  });

  const [q, setQ] = useState("");

  const history: Record<FolderKey, HistoryItem[]> = {
    images: [
      { id: "img1", title: "Cyberpunk portrait • 85mm", time: "Today 18:22" },
      { id: "img2", title: "Product shot • studio white", time: "Today 17:40" },
    ],
    videos: [{ id: "vid1", title: "Promo motion • 9:16", time: "Yesterday 23:10" }],
    ocr: [{ id: "ocr1", title: "Passport OCR • Extracted", time: "Yesterday 19:05" }],
    reports: [{ id: "rep1", title: "Forgery check • Suspicious marks", time: "Yesterday 15:55" }],
  };

  const widthClass = open ? "w-72 md:w-80" : "w-72 md:w-[84px]";
  const translate = open ? "translate-x-0" : "-translate-x-full md:translate-x-0";

  const filterItems = (items: HistoryItem[]) => {
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    return items.filter((it) => it.title.toLowerCase().includes(s));
  };

  return (
    <aside
      className={cn(
        "fixed md:sticky z-30 top-0 md:top-4 bottom-0 left-0",
        "md:h-[calc(100vh-16px)]",
        widthClass,
        translate,
        "md:ml-3 md:rounded-[26px] md:border overflow-hidden",
        "border-r md:border-r-0",
        "backdrop-blur-2xl transition-all duration-[420ms] ease-[cubic-bezier(0.23,0.82,0.34,1)]",
        theme.border,
        theme.sidebarBg,
        theme.sidebarShadow,
        "flex flex-col relative"
      )}
    >
      {/* Header */}
      <div className={cn("border-b", theme.border)}>
        <div className={cn("px-4 h-[74px] flex items-center justify-between")}>
          <div className={cn("flex items-center gap-3 min-w-0", !open && "md:flex-col md:gap-2 md:justify-center md:py-2 md:px-0")}>
            <div className={cn("relative", open ? "h-12 w-12" : "h-11 w-11")}>
              <Image src="/QXT-Vision.png" alt="QXT Vision" fill className="object-contain" priority />
            </div>

            {open && (
              <div className="leading-tight min-w-0">
                <div className={cn("text-[13px] font-semibold truncate", theme.text)}>QXT Vision</div>
                <div className={cn("text-[11px] truncate", theme.muted)}>Iris Studio</div>
              </div>
            )}
          </div>

          {open && (
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleTheme}
                type="button"
                className={cn("h-9 w-9 rounded-2xl border transition hover:scale-[1.02] active:scale-[0.98]", theme.border, theme.btn)}
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun className="w-4 h-4 mx-auto opacity-80" /> : <Moon className="w-4 h-4 mx-auto opacity-80" />}
              </button>

              <button
                onClick={onClose}
                type="button"
                className={cn("md:hidden h-9 w-9 rounded-2xl border transition", theme.border, theme.btn)}
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4 mx-auto opacity-80" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Library Header + single premium arrow beside "Library" */}
      {open && (
        <div className={cn("px-3 pt-3 pb-3 border-b", theme.border)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 opacity-80" />
              <div className={cn("text-[12px] font-semibold", theme.text)}>Library</div>

              <span className={cn("ml-1 text-[10px] px-2 py-[2px] rounded-full border", "bg-white/[0.05] border-white/10", darkMode ? "text-white/80" : "text-slate-700")}>
                Saved Works
              </span>
            </div>

            {/* ✅ the only arrow */}
            <button
              type="button"
              onClick={onToggleOpen}
              aria-label="Collapse sidebar"
              className={cn(
                "h-9 w-9 rounded-2xl border flex items-center justify-center transition active:scale-[0.98]",
                theme.border,
                darkMode ? "bg-white/[0.04] hover:bg-white/[0.07]" : "bg-white/70 hover:bg-white",
                darkMode
                  ? "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_14px_50px_rgba(0,0,0,0.45)]"
                  : "shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_14px_40px_rgba(15,23,42,0.10)]"
              )}
              title="Collapse"
            >
              <ChevronLeft className={cn("w-4 h-4", darkMode ? "text-white/85" : "text-slate-800")} />
            </button>
          </div>

          <div className="mt-3 relative">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", theme.muted)} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in library..." className={cn("w-full h-11 pl-10 pr-3 rounded-2xl border outline-none", theme.input)} />
          </div>
        </div>
      )}

      {/* ✅ When sidebar is collapsed: show only ONE arrow button (still "beside Library" area) */}
      {!open && (
        <div className={cn("px-3 pt-4 pb-4 border-b flex justify-center", theme.border)}>
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label="Expand sidebar"
            className={cn(
              "h-10 w-10 rounded-2xl border flex items-center justify-center transition active:scale-[0.98]",
              theme.border,
              darkMode ? "bg-white/[0.04] hover:bg-white/[0.07]" : "bg-white/70 hover:bg-white",
              darkMode
                ? "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_14px_50px_rgba(0,0,0,0.45)]"
                : "shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_14px_40px_rgba(15,23,42,0.10)]"
            )}
            title="Expand"
          >
            <ChevronRight className={cn("w-4 h-4", darkMode ? "text-white/85" : "text-slate-800")} />
          </button>
        </div>
      )}

      {/* Sections */}
      <div className={cn("flex-1 py-3 overflow-y-auto qxt-scroll", open ? "px-3" : "px-2")}>
        {(Object.keys(SECTION_META) as FolderKey[]).map((key) => {
          const meta = SECTION_META[key];
          const items = open ? filterItems(history[key]) : history[key];
          return (
            <FolderBlock
              key={key}
              open={open}
              theme={theme}
              meta={meta}
              expanded={foldersOpen[key]}
              onToggle={() => setFoldersOpen((p) => ({ ...p, [key]: !p[key] }))}
              items={items}
              darkMode={darkMode}
            />
          );
        })}
      </div>
    </aside>
  );
}

function FolderBlock({
  open,
  theme,
  meta,
  expanded,
  onToggle,
  items,
  darkMode,
}: {
  open: boolean;
  theme: any;
  meta: {
    title: string;
    hint: string;
    icon: React.ComponentType<any>;
    accentDot: string;
    line: string;
    glow: string;
    chip: string;
    badge: string;
    itemTopLine: string;
  };
  expanded: boolean;
  onToggle: () => void;
  items: Array<{ id: string; title: string; time: string }>;
  darkMode: boolean;
}) {
  const Icon = meta.icon;
  const iconColor = darkMode ? "text-white/85" : "text-slate-800";

  return (
    <div className="mb-2">
      {/* Section Header (no arrow at all) */}
<button
  type="button"
  onClick={onToggle}
  className={cn(
    "w-full rounded-2xl border transition relative overflow-hidden",
    open
      ? "px-3 h-12 flex items-center"
      : "h-12 flex items-center justify-center", // ✅ center
    theme.border,
    theme.btn,
    theme.rowHover,
    expanded && theme.ring
  )}
  title={!open ? meta.title : undefined}
>
  <div className={cn("pointer-events-none absolute top-0 left-0 right-0 h-[2px]", meta.line, "opacity-90")} />

  {/* Icon chip */}
  <div
    className={cn(
      "relative rounded-2xl border flex items-center justify-center",
      meta.chip,
      open ? "h-9 w-9 mr-3" : "h-10 w-10 mr-0" // ✅ no margin when collapsed
    )}
  >
    {expanded && open && ( // ✅ glow only when open (cleaner)
      <div className={cn("absolute -inset-3 rounded-[18px] blur-xl", meta.glow, "opacity-70")} />
    )}
    <Icon className={cn("relative", open ? "w-4 h-4" : "w-5 h-5", iconColor)} />
  </div>

  {/* Text only when open */}
  {open && (
    <div className="flex-1 min-w-0 text-left leading-tight">
      <div className={cn("flex items-center gap-2 text-[12px] font-semibold line-clamp-1", theme.text)}>
        <span className={cn("h-2 w-2 rounded-full", meta.accentDot)} />
        {meta.title}
        <span className={cn("ml-1 text-[10px] px-2 py-[1px] rounded-full border", meta.badge)}>
          {expanded ? "Open" : "Closed"}
        </span>
      </div>
      <div className={cn("text-[10px] mt-0.5 line-clamp-1", theme.muted)}>{meta.hint}</div>
    </div>
  )}
</button>


      {/* Items */}
      {open && expanded && (
        <div className="mt-2 pl-3">
          <div className="relative pl-4 space-y-1">
            <div className={cn("pointer-events-none absolute left-1 top-1 bottom-1 w-px", darkMode ? "bg-white/10" : "bg-slate-900/10")} />

            {items.length === 0 ? (
              <div className={cn("text-[11px] px-2 py-2 rounded-xl", theme.muted)}>No items yet.</div>
            ) : (
              items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {}}
                  className={cn("w-full text-left px-2 py-2 rounded-xl transition", darkMode ? "hover:bg-white/[0.04]" : "hover:bg-slate-900/[0.04]")}
                  title={it.title}
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("mt-[6px] h-2 w-2 rounded-full opacity-80", meta.accentDot)} />
                    <div className="min-w-0">
                      <div className={cn("text-[12px] font-medium line-clamp-1", theme.text)}>{it.title}</div>
                      <div className={cn("text-[10px] mt-0.5", theme.muted)}>{it.time}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
