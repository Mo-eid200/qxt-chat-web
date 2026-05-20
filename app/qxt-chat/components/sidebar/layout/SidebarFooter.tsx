import React from "react";
import Image from "next/image";
import {
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";

import { cn } from "../utils/cn";

type SidebarFooterProps = {
    collapsed: boolean;
    darkMode: boolean;

    onToggleCollapse: () => void;
};

export function SidebarFooter({
    collapsed,
    darkMode,
    onToggleCollapse,
}: SidebarFooterProps) {
    return (
        <div
            className={cn(
                `
                mt-auto
                border-t
                px-2.5
                py-2.5
                backdrop-blur-2xl
                transition-all duration-300
                `,
                darkMode
                    ? `
                      border-white/[0.05]
                      bg-[#060816]/75
                    `
                    : `
                      border-black/[0.05]
                      bg-white/70
                    `
            )}
        >
            {collapsed ? (
                <div className="flex flex-col items-center gap-2">
                    {/* Logo */}
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className={cn(
                            `
                            group
                            relative flex h-12 w-12
                            items-center justify-center
                            overflow-hidden
                            rounded-2xl
                            transition-all duration-300
                            `,
                            darkMode
                                ? `
                                  bg-white/[0.04]
                                  hover:bg-white/[0.08]
                                  border border-white/[0.06]
                                `
                                : `
                                  bg-black/[0.04]
                                  hover:bg-black/[0.06]
                                  border border-black/[0.05]
                                `
                        )}
                    >
                        <Image
                            src="/OpenQCore.png"
                            alt="OpenQCore"
                            fill
                            sizes="64px"
                            className="
                                object-contain
                                scale-[1.18]
                                transition-transform duration-300
                                group-hover:scale-[1.24]
                            "
                        />
                    </button>

                    {/* Expand Button */}
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className={cn(
                            `
                            hidden md:flex
                            h-9 w-9
                            items-center justify-center
                            rounded-xl
                            transition-all duration-200
                            `,
                            darkMode
                                ? `
                                  bg-white/[0.04]
                                  hover:bg-white/[0.08]
                                  text-white/65
                                  hover:text-white
                                `
                                : `
                                  bg-black/[0.04]
                                  hover:bg-black/[0.08]
                                  text-slate-700
                                `
                        )}
                    >
                        <PanelLeftOpen className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <div
                    className={cn(
                        `
                        group
                        relative
                        flex items-center gap-3
                        overflow-hidden
                        rounded-2xl
                        px-3 py-3
                        transition-all duration-300
                        `,
                        darkMode
                            ? `
                              border border-white/[0.05]
                              bg-white/[0.025]
                              hover:bg-white/[0.04]
                            `
                            : `
                              border border-black/[0.04]
                              bg-black/[0.02]
                              hover:bg-black/[0.04]
                            `
                    )}
                >
                    {/* Glow */}
                    <div
                        className="
                            pointer-events-none
                            absolute inset-0
                            opacity-0
                            transition-opacity duration-500
                            group-hover:opacity-100
                            bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_65%)]
                        "
                    />

                    {/* Logo */}
                    <div
                        className={cn(
                            `
                            relative
                            h-12 w-12
                            overflow-hidden
                            rounded-2xl
                            flex-shrink-0
                            transition-all duration-300
                            `,
                            darkMode
                                ? `
                                  bg-white/[0.04]
                                  border border-white/[0.06]
                                `
                                : `
                                  bg-black/[0.04]
                                  border border-black/[0.05]
                                `
                        )}
                    >
                        <Image
                            src="/OpenQCore.png"
                            alt="OpenQCore"
                            fill
                            sizes="64px"
                            className="
                                object-contain
                                scale-[1.22]
                                transition-transform duration-300
                                group-hover:scale-[1.28]
                            "
                        />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 leading-tight">
                        <div className="flex items-center gap-2">
                            <span
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
                                ChatQXT
                            </span>

                            <span
                                className={cn(
                                    `
                                    rounded-full
                                    px-1.5 py-0.5
                                    text-[9px]
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    `,
                                    darkMode
                                        ? `
                                          bg-cyan-400/10
                                          text-cyan-300/80
                                        `
                                        : `
                                          bg-sky-500/10
                                          text-sky-700
                                        `
                                )}
                            >
                                Gen 1.1
                            </span>
                        </div>

                        <div
                            className={cn(
                                `
                                mt-0.5
                                truncate
                                text-[10px]
                                `,
                                darkMode
                                    ? "text-white/38"
                                    : "text-slate-500"
                            )}
                        >
                            Powered by OpenQCore
                        </div>
                    </div>

                    {/* Collapse Button */}
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className={cn(
                            `
                            hidden md:flex
                            h-9 w-9
                            shrink-0
                            items-center justify-center
                            rounded-xl
                            transition-all duration-200
                            `,
                            darkMode
                                ? `
                                  bg-white/[0.04]
                                  hover:bg-white/[0.08]
                                  text-white/65
                                  hover:text-white
                                `
                                : `
                                  bg-black/[0.04]
                                  hover:bg-black/[0.08]
                                  text-slate-700
                                `
                        )}
                    >
                        <PanelLeftClose className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}