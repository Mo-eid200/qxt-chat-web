import React from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "../utils/cn";

type ProjectsHeaderProps = {
  title: string;
  open: boolean;
  darkMode: boolean;
  onToggle?: () => void;
  onCreateProject?: () => void;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
};

export function ProjectsHeader({
  title,
  open,
  darkMode,
  onToggle,
  onCreateProject,
  anchorRef,
}: ProjectsHeaderProps) {
  return (
    <div
      ref={anchorRef}
      className="flex items-center justify-between px-1 pb-1.5"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 items-center gap-1.5 text-left"
      >
        <div
          className={cn(
            "text-[14px] font-semibold",
            darkMode
              ? "text-white"
              : "text-slate-900"
          )}
        >
          {title}
        </div>

        {open ? (
          <ChevronDown
            className={cn(
              "w-4 h-4",
              darkMode
                ? "text-white/55"
                : "text-slate-500"
            )}
          />
        ) : (
          <ChevronRight
            className={cn(
              "w-4 h-4",
              darkMode
                ? "text-white/55"
                : "text-slate-500"
            )}
          />
        )}
      </button>

      <button
        type="button"
        onClick={onCreateProject}
        className={cn(
          "h-7 w-7 rounded-lg flex items-center justify-center transition shrink-0",
          darkMode
            ? "text-white/70 hover:text-white hover:bg-white/[0.06]"
            : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.05]"
        )}
        title="Create project"
        aria-label="Create project"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}