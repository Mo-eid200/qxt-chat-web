"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles, Gauge, Scale, Brain, Wand2, MoreHorizontal, X } from "lucide-react";
import { useModels, type PublicModelItem } from "../../context/ModelsContext";

type Props = {
  darkMode: boolean;
};

// ✅ Real SVG icons instead of emoji, matching the rest of the app's
// lucide-react icon set.
const GROUP_META: Record<
  string,
  { label: string; color: string; iconBg: string; Icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  core: {
    label: "Core",
    color: "text-blue-400",
    iconBg: "bg-blue-500/15 border-blue-500/25",
    Icon: Gauge,
    description: "Fast, everyday, low cost",
  },
  nexus: {
    label: "Nexus",
    color: "text-emerald-400",
    iconBg: "bg-emerald-500/15 border-emerald-500/25",
    Icon: Scale,
    description: "Balanced for productivity",
  },
  quantum: {
    label: "Quantum",
    color: "text-purple-400",
    iconBg: "bg-purple-500/15 border-purple-500/25",
    Icon: Brain,
    description: "Advanced reasoning, complex tasks",
  },
  nova: {
    label: "Nova",
    color: "text-amber-400",
    iconBg: "bg-amber-500/15 border-amber-500/25",
    Icon: Wand2,
    description: "Creative writing and ideas",
  },
};

export function ModelSelector({ darkMode }: Props) {
  const { groupedModels, selected, selectModel, label } = useModels();
  const [open, setOpen] = useState(false);
  // ✅ Two-view pattern mirroring the mobile app: "quick" shows one
  // representative model per family (fast to scan, one tap to pick),
  // "all" is a secondary view listing every model grouped by family
  // for anyone who wants to dig in. Avoids the previous single
  // always-expanded list, which required two taps per model and
  // buried the choice behind unfamiliar family names.
  const [view, setView] = useState<"quick" | "all">("quick");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setView("quick");
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback(
    (model: PublicModelItem) => {
      selectModel(model.id, model.gen);
      setOpen(false);
    },
    [selectModel]
  );

  // ✅ One representative model per family for the quick-pick view —
  // the first model in each group (assumed to be that family's
  // flagship/default, matching the mobile app's groupModels sort).
  const quickPicks = useMemo(
    () =>
      groupedModels
        .filter((g) => g.groupKey !== "__ungrouped__")
        .map((g) => ({ group: g, model: g.models[0] }))
        .filter((x) => !!x.model),
    [groupedModels]
  );
  const ungroupedModels = useMemo(
    () => groupedModels.find((g) => g.groupKey === "__ungrouped__")?.models || [],
    [groupedModels]
  );

  const menuClass = darkMode
    ? "bg-[#0d1117] border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
    : "bg-white border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.15)]";

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-medium
          transition-all duration-150
          ${darkMode
            ? "text-white/45 hover:text-white/70 hover:bg-white/[0.06]"
            : "text-black/45 hover:text-black/70 hover:bg-black/[0.06]"
          }
        `}
      >
        <Sparkles className="w-3 h-3" />
        <span className="hidden sm:block max-w-[140px] truncate">{label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && groupedModels.length > 0 && (
        <div
          className={`
            absolute bottom-full mb-2 right-0 w-[21rem] max-h-[30rem]
            rounded-2xl border overflow-hidden
            animate-in slide-in-from-bottom-2 fade-in duration-150
            z-50 ${menuClass}
          `}
        >
          {/* ✅ Sliding two-panel container — both views render at
              once, side by side, and we translate the wrapper so the
              transition matches the mobile app's slide-from-right
              pattern instead of an abrupt content swap. */}
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: view === "all" ? "translateX(-50%)" : "translateX(0%)", width: "200%" }}
            >
              {/* ── Quick picks view ── */}
              <div className="w-1/2 max-h-[30rem] overflow-y-auto qxt-scroll">
                <div className="px-3.5 pt-3 pb-1.5">
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${darkMode ? "text-white/35" : "text-black/35"}`}>
                    Choose a model
                  </span>
                </div>
                <div className="px-2 pb-1.5 space-y-0.5">
                  {quickPicks.map(({ group, model }) => {
                    const meta = GROUP_META[group.groupKey] || {
                      label: group.groupKey,
                      color: darkMode ? "text-white/50" : "text-black/50",
                      iconBg: darkMode ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10",
                      Icon: Sparkles,
                      description: "",
                    };
                    const GroupIcon = meta.Icon;
                    const isSelected = selected?.id === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model)}
                        className={`
                          w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left
                          transition-colors duration-100
                          ${isSelected
                            ? darkMode ? "bg-white/[0.07]" : "bg-black/[0.05]"
                            : darkMode ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]"
                          }
                        `}
                      >
                        <div className={`h-8 w-8 shrink-0 rounded-lg border flex items-center justify-center ${meta.iconBg}`}>
                          <GroupIcon className={`w-4 h-4 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold truncate ${darkMode ? "text-white/90" : "text-black/90"}`}>
                            {meta.label}
                          </div>
                          {meta.description && (
                            <div className={`text-[11px] truncate ${darkMode ? "text-white/35" : "text-black/35"}`}>
                              {meta.description}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0 text-blue-400" />}
                      </button>
                    );
                  })}
                  {ungroupedModels.map((model) => (
                    <ModelRow key={model.id} model={model} isSelected={selected?.id === model.id} darkMode={darkMode} onSelect={handleSelect} />
                  ))}
                </div>

                <button
                  onClick={() => setView("all")}
                  className={`
                    w-full flex items-center gap-2.5 mx-2 mb-2 px-2.5 py-2.5 rounded-xl text-left border-t
                    ${darkMode ? "border-white/[0.06] hover:bg-white/[0.04]" : "border-black/[0.06] hover:bg-black/[0.03]"}
                  `}
                  style={{ width: "calc(100% - 1rem)" }}
                >
                  <div className={`h-8 w-8 shrink-0 rounded-lg border flex items-center justify-center ${darkMode ? "bg-white/[0.06] border-white/10" : "bg-black/[0.04] border-black/10"}`}>
                    <MoreHorizontal className={`w-4 h-4 ${darkMode ? "text-white/50" : "text-black/50"}`} />
                  </div>
                  <span className={`flex-1 text-sm font-medium ${darkMode ? "text-white/80" : "text-black/80"}`}>
                    More models
                  </span>
                  <ChevronRight className={`w-4 h-4 ${darkMode ? "text-white/30" : "text-black/30"}`} />
                </button>
              </div>

              {/* ── All models view ── */}
              <div className="w-1/2 max-h-[30rem] overflow-y-auto qxt-scroll">
                <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-3 backdrop-blur-sm border-b ${menuClass}">
                  <button
                    onClick={() => setView("quick")}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center ${darkMode ? "hover:bg-white/[0.08] text-white/60" : "hover:bg-black/[0.06] text-black/60"}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className={`text-[13px] font-semibold ${darkMode ? "text-white/90" : "text-black/90"}`}>
                    All models
                  </span>
                </div>

                {groupedModels.map((group) => {
                  if (group.groupKey === "__ungrouped__") return null;
                  const meta = GROUP_META[group.groupKey] || {
                    label: group.groupKey,
                    color: darkMode ? "text-white/50" : "text-black/50",
                    iconBg: darkMode ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10",
                    Icon: Sparkles,
                    description: "",
                  };
                  return (
                    <div key={group.groupKey} className="px-2 pt-2.5">
                      <span className={`px-1.5 text-[10.5px] font-semibold uppercase tracking-wide ${meta.color}`}>
                        {meta.label}
                      </span>
                      <div className="mt-1 space-y-0.5 pb-1">
                        {group.models.map((model, idx) => (
                          <ModelRow
                            key={model.id}
                            model={model}
                            isSelected={selected?.id === model.id}
                            darkMode={darkMode}
                            onSelect={handleSelect}
                            accentColor={meta.color}
                            isRecommended={idx === 0}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="h-1.5" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelRow({
  model,
  isSelected,
  darkMode,
  onSelect,
  accentColor,
  isRecommended,
}: {
  model: PublicModelItem;
  isSelected: boolean;
  darkMode: boolean;
  onSelect: (model: PublicModelItem) => void;
  accentColor?: string;
  isRecommended?: boolean;
}) {
  const genLabel = model.generation?.label || `G${model.gen}`;
  return (
    <button
      onClick={() => onSelect(model)}
      className={`
        w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm text-left relative
        transition-colors duration-100
        ${isSelected
          ? darkMode ? "bg-white/[0.06] text-white" : "bg-black/[0.05] text-black"
          : darkMode ? "text-white/55 hover:bg-white/[0.04] hover:text-white/80"
                     : "text-black/55 hover:bg-black/[0.03] hover:text-black/80"
        }
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium truncate">{model.public_name}</span>
          {isRecommended && (
            <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.5 py-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              Recommended
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-white/[0.07] border border-white/[0.06] ${accentColor || "text-white/50"}`}>
            {genLabel}
          </span>
        </div>
        {model.description && (
          <div className={`text-[11px] mt-1 truncate ${darkMode ? "text-white/35" : "text-black/35"}`}>
            {model.description}
          </div>
        )}
      </div>
      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-blue-400 mt-0.5" />}
    </button>
  );
}

ModelSelector.displayName = "ModelSelector";
