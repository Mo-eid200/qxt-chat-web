"use client";

import React from "react";
import Image from "next/image";
import { PanelLeft, Search, X } from "lucide-react";

export type SidebarHeaderProps = {
  open: boolean;
  onCloseAction?: () => void;
  collapsed: boolean;
  darkMode: boolean;
  onToggleCollapse: () => void;
};

export function SidebarHeader({
  open,
  onCloseAction,
  collapsed,
  darkMode,
  onToggleCollapse,
}: SidebarHeaderProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="group relative flex h-11 w-11 items-center justify-center rounded-lg transition-all hover:bg-white/[0.06]"
        >
          {/* Logo — visible by default, fades out on hover */}
          <span className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity duration-150 group-hover:opacity-0">
            <Image
              src="/chatqxt.png"
              alt="ChatQXT"
              width={60}
              height={60}
              className="rounded-md object-contain"
            />
          </span>

          {/* Expand icon — hidden by default, fades in on hover */}
          <PanelLeft className="absolute h-5 w-5 text-white/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-2.5">
        <span className="text-[17px] tracking-tight text-white/95">
          Chat<span className="font-bold text-white">QXT</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/70"
          title="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/70"
          title="Collapse sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {onCloseAction && (
          <button
            type="button"
            onClick={onCloseAction}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/70 md:hidden"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}