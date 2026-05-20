"use client";

import React from "react";
import { X } from "lucide-react";

import { cn } from "../utils/cn";

type SidebarHeaderProps = {
    open: boolean;

    collapsed: boolean;

    darkMode: boolean;

    onCloseAction?: () => void;

    onAccountClickAction?: () => void;

    avatarLetter: string;
    displayName: string;
    subText: string;
};

export function SidebarHeader({
    collapsed,
    avatarLetter,
    displayName,
    subText,
    darkMode,
    onAccountClickAction,
    onCloseAction,
}: SidebarHeaderProps) {
    return (
        <div
            className={cn(
                `
                relative
                flex items-center justify-between
                px-3 py-3
                border-b
                backdrop-blur-2xl
                transition-all duration-300
                `,
                darkMode
                    ? `
                      border-white/[0.05]
                      bg-[#060816]/80
                    `
                    : `
                      border-black/[0.05]
                      bg-white/70
                    `
            )}
        >
            {/* Account */}
            <button
                type="button"
                onClick={onAccountClickAction}
                className={cn(
                    `
                    group
                    flex items-center
                    min-w-0
                    transition-all duration-200
                    `,
                    collapsed
                        ? "justify-center w-full"
                        : "gap-3"
                )}
            >
                {/* Avatar */}
                <div
                    className={cn(
                        `
                        relative
                        flex h-10 w-10 shrink-0
                        items-center justify-center
                        rounded-2xl
                        text-[12px] font-semibold text-white
                        transition-all duration-300
                        `,
                        darkMode
                            ? `
                              bg-gradient-to-br
                              from-cyan-400
                              via-blue-500
                              to-emerald-500

                              shadow-[0_10px_30px_rgba(6,182,212,0.22)]
                            `
                            : `
                              bg-gradient-to-br
                              from-sky-500
                              to-cyan-500
                            `
                    )}
                >
                    {avatarLetter.toUpperCase()}
                </div>

                {/* User Info */}
                {!collapsed && (
                    <div className="min-w-0 flex-1 text-left">
                        <div
                            className={cn(
                                `
                                truncate
                                text-[13px]
                                font-semibold
                                tracking-[-0.01em]
                                `,
                                darkMode
                                    ? "text-white/92"
                                    : "text-slate-900"
                            )}
                        >
                            {displayName}
                        </div>

                        <div
                            className={cn(
                                `
                                truncate
                                text-[11px]
                                `,
                                darkMode
                                    ? "text-white/40"
                                    : "text-slate-500"
                            )}
                        >
                            {subText}
                        </div>
                    </div>
                )}
            </button>

            {/* Mobile Close */}
                        <button
                                onClick={onCloseAction}
                                type="button"
                                aria-label="Close sidebar"
                                className={cn(
                                        `
                                        md:hidden
                                        flex h-9 w-9 shrink-0
                                        items-center justify-center
                                        rounded-xl
                                        transition-all duration-200
                                        `,
                                        darkMode
                                                ? `
                                                    bg-white/[0.04]
                                                    text-white/65
                                                    hover:bg-white/[0.08]
                                                    hover:text-white
                                                `
                                                : `
                                                    bg-black/[0.04]
                                                    text-slate-700
                                                    hover:bg-black/[0.08]
                                                `
                                )}
                        >
                                <X className="h-4 w-4" />
                        </button>
        </div>
    );
}