"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { ChevronDown, Zap, Check, Star } from "lucide-react";
import { useModels, type PublicModelItem } from "../../context/ModelsContext";

type Props = {
  darkMode: boolean;
};

const GROUP_META: Record<string, { label: string; color: string; dot: string; icon: string; description: string }> = {
  core: {
    label: "Core",
    color: "text-blue-400",
    dot: "bg-blue-400",
    icon: "⚡",
    description: "Fast • Everyday • Low Cost",
  },
  nexus: {
    label: "Nexus",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    icon: "⚖️",
    description: "Balanced • Productivity",
  },
  quantum: {
    label: "Quantum",
    color: "text-purple-400",
    dot: "bg-purple-400",
    icon: "🧠",
    description: "Advanced Reasoning • Complex Tasks",
  },
  nova: {
    label: "Nova",
    color: "text-amber-400",
    dot: "bg-amber-400",
    icon: "✨",
    description: "Creative • Ideas • Writing",
  },
};

export function ModelSelector({ darkMode }: Props) {
  const { groupedModels, selected, selectModel, label } = useModels();
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || expandedGroup) return;
    const group = groupedModels.find((g) => g.models.some((m) => m.id === selected?.id));
    setExpandedGroup(group?.groupKey || groupedModels[0]?.groupKey || null);
  }, [open, groupedModels, selected, expandedGroup]);

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

  const menuClass = darkMode
    ? "bg-[#0d1117] border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    : "bg-white border-black/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.12)]";

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
        <Zap className="w-3 h-3" />
        <span className="hidden sm:block max-w-[140px] truncate">{label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && groupedModels.length > 0 && (
        <div
          className={`
            absolute bottom-full mb-2 left-0 w-80 max-h-[28rem] overflow-y-auto qxt-scroll
            rounded-xl border overflow-hidden
            animate-in slide-in-from-bottom-2 fade-in duration-150
            z-50 ${menuClass}
          `}
        >
          {groupedModels.map((group) => {
            if (group.groupKey === "__ungrouped__") {
              return group.models.map((model, idx) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  isSelected={selected?.id === model.id}
                  darkMode={darkMode}
                  onSelect={handleSelect}
                  isRecommended={false}
                />
              ));
            }

            const meta = GROUP_META[group.groupKey] || {
              label: group.groupKey,
              color: darkMode ? "text-white/50" : "text-black/50",
              dot: "bg-zinc-400",
              icon: "•",
              description: "",
            };
            const isExpanded = expandedGroup === group.groupKey;
            const hasSelected = group.models.some((m) => m.id === selected?.id);

            return (
              <div key={group.groupKey} className="border-b border-white/[0.04] last:border-b-0">
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.groupKey)}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-3
                    transition-colors duration-100
                    ${darkMode ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]"}
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{meta.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[12px] font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                        {hasSelected && !isExpanded && (
                          <Check className={`w-3 h-3 ${meta.color}`} />
                        )}
                      </div>
                      {meta.description && (
                        <div className={`text-[10px] mt-0.5 ${darkMode ? "text-white/30" : "text-black/30"}`}>
                          {meta.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    } ${darkMode ? "text-white/30" : "text-black/30"}`}
                  />
                </button>

                <div
  className="grid transition-all duration-300 ease-in-out"
  style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
>
  <div className="overflow-hidden">
    <div className="relative pb-1.5">
      {/* خط عمودي رفيع يربط الموديلات الفرعية بصريًا بمجموعتها */}
      <div
        className={`absolute left-[22px] top-0 bottom-2 w-px ${
          darkMode ? "bg-white/[0.08]" : "bg-black/[0.08]"
        }`}
      />
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
</div>
              </div>
            );
          })}
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
        w-full flex items-center gap-2.5 pl-9 pr-3.5 py-2.5 text-sm text-left relative
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
            <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-400">
              <Star className="w-2.5 h-2.5 fill-current" />
              Recommended
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] ${accentColor || "text-white/50"}`}>
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