"use client";

import React from "react";
import { motion } from "framer-motion";
import { useHydrated } from "@/app/hooks/useHydrated";

import {
    Building2,
    Sparkles,
    User2,
} from "lucide-react";

import type {
    BusinessMeResponse,
} from "../../../../types/business";

type Props = {
    darkMode: boolean;

    businessState:
    | BusinessMeResponse
    | null;

    currentEnvironment:
    | "personal"
    | "workspace";

    onEnvironmentChangeAction?: (
        env:
            | "personal"
            | "workspace"
    ) => void;

    onOpenBusinessSettingsAction?: () => void;
};

export default function WorkspaceSwitcherSection({
    businessState,
    currentEnvironment,
    onEnvironmentChangeAction,
    onOpenBusinessSettingsAction,
}: Props) {
    const memberships =
        businessState?.memberships || [];

    const currentBusiness =
        businessState?.current_business;

    const hasWorkspace =
        memberships.length > 0;

    const hasPaidWorkspace =
        memberships.some((m) => {
            const plan =
                String(
                    m.plan || ""
                ).toLowerCase();

            return (
                plan &&
                plan !== "free" &&
                plan !== "free plan"
            );
        });

    const hydrated =
        useHydrated();

    const switchEnvironment = (
        env:
            | "personal"
            | "workspace"
    ) => {
        if (
            env === "workspace" &&
            !hasWorkspace
        ) {
            onOpenBusinessSettingsAction?.();
            return;
        }

        if (env === "personal") {
            localStorage.removeItem(
                "qxt_workspace_id"
            );
        } else {
            const first =
                memberships[0];

            if (!first) return;

            localStorage.setItem(
                "qxt_workspace_id",
                String(first.workspace_id)
            );
        }

        onEnvironmentChangeAction?.(
            env
        );

    };

    const workspaceLabel =
        !hydrated
            ? "Workspace"
            : currentEnvironment ===
                "workspace"
                ? currentBusiness?.workspace_name ||
                "Workspace"
                : "Personal Workspace";

    return (
        <div className="px-2.5 pt-1 pb-2">
            <div
                className="
        relative
        overflow-hidden

        rounded-[20px]
        border border-white/[0.06]

        bg-white/[0.025]
        backdrop-blur-2xl

        shadow-[0_8px_40px_rgba(0,0,0,0.28)]
      "
            >
                {/* glow */}
                <div
                    className={`
            absolute inset-0 opacity-60 pointer-events-none
            ${currentEnvironment ===
                            "workspace"
                            ? "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_40%)]"
                            : "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_40%)]"
                        }
          `}
                />

                {/* top */}
                <div className="relative px-3 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        <div
                            className={`
                h-8 w-8 rounded-xl
                flex items-center justify-center
                ${currentEnvironment ===
                                    "workspace"
                                    ? "bg-cyan-400/[0.12] text-cyan-200"
                                    : "bg-emerald-400/[0.12] text-emerald-200"
                                }
              `}
                        >
                            <Sparkles className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-white/92 truncate">
                                {workspaceLabel}
                            </div>

                            <div className="text-[10px] text-white/42 truncate">
                                AI operating context
                            </div>
                        </div>
                    </div>
                </div>

                {/* switch */}
                <div className="relative px-3 pb-3">
                    <div
                        className="
            relative
            grid grid-cols-2

            rounded-[14px]
            border border-white/[0.06]

            bg-black/20
            p-1
          "
                    >
                        {/* active bg */}
                        <motion.div
                            layout
                            transition={{
                                type: "spring",
                                stiffness: 380,
                                damping: 30,
                            }}
                            className={`
                absolute top-1 bottom-1
                w-[calc(50%-4px)]
                rounded-[10px]

                ${currentEnvironment ===
                                    "workspace"
                                    ? "left-[calc(50%+2px)] bg-cyan-400"
                                    : "left-1 bg-emerald-400"
                                }
              `}
                        />

                        {/* personal */}
                        <button
                            onClick={() =>
                                switchEnvironment(
                                    "personal"
                                )
                            }
                            className={`
                relative z-10
                h-10

                flex items-center justify-center gap-2

                rounded-[10px]

                text-[12px]
                font-medium

                transition-all

                ${currentEnvironment ===
                                    "personal"
                                    ? "text-black"
                                    : "text-white/65 hover:text-white"
                                }
              `}
                        >
                            <User2 className="w-4 h-4" />
                            Personal
                        </button>

                        {/* workspace */}
                        <button
                            onClick={() =>
                                switchEnvironment(
                                    "workspace"
                                )
                            }
                            className={`
                relative z-10
                h-10

                flex items-center justify-center gap-2

                rounded-[10px]

                text-[12px]
                font-medium

                transition-all

                ${currentEnvironment ===
                                    "workspace"
                                    ? "text-black"
                                    : "text-white/65 hover:text-white"
                                }
              `}
                        >
                            <Building2 className="w-4 h-4" />

                            {hasPaidWorkspace
                                ? "Workspace"
                                : "Upgrade"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}