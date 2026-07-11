"use client";

import React from "react";
import type { BusinessMeResponse } from "../../../../types/business";
import type { SidebarEnvironment } from "../constants/sidebarEnvironment";

export type WorkspaceSwitcherSectionProps = {
  darkMode: boolean;
  businessState: BusinessMeResponse | null;
  currentEnvironment: SidebarEnvironment;
  onEnvironmentChangeAction: (env: SidebarEnvironment) => void;
  onOpenBusinessSettingsAction: () => void;
};

export default function WorkspaceSwitcherSection({
  businessState,
  currentEnvironment,
  onEnvironmentChangeAction,
}: WorkspaceSwitcherSectionProps) {
  const hasWorkspace = !!businessState?.memberships?.length;

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-1 rounded-full bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={() => onEnvironmentChangeAction("personal")}
          className={`
            flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all
            ${currentEnvironment === "personal"
              ? "bg-white/[0.08] text-white"
              : "text-white/40 hover:text-white/70"
            }
          `}
        >
          Personal
        </button>

        <button
          type="button"
          disabled={!hasWorkspace}
          onClick={() => hasWorkspace && onEnvironmentChangeAction("workspace")}
          className={`
            flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all
            ${currentEnvironment === "workspace"
              ? "bg-white/[0.08] text-white"
              : hasWorkspace
                ? "text-white/40 hover:text-white/70"
                : "text-white/15 cursor-not-allowed"
            }
          `}
          title={hasWorkspace ? "Workspace" : "No workspace yet"}
        >
          Workspace
        </button>
      </div>
    </div>
  );
}