"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { PanelLeft, Search, X } from "lucide-react";

export type SidebarHeaderProps = {
  open: boolean;
  onCloseAction?: () => void;

  collapsed: boolean;
  darkMode: boolean;

  onToggleCollapse: () => void;

  searchOpen: boolean;
  searchValue: string;

  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onSearchChange: (value: string) => void;
};

export function SidebarHeader({
  open,
  onCloseAction,

  collapsed,
  darkMode,

  onToggleCollapse,

  searchOpen,
  searchValue,

  onOpenSearch,
  onCloseSearch,
  onSearchChange,
}: SidebarHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [searchOpen]);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="group relative flex h-11 w-11 items-center justify-center rounded-lg transition-all hover:bg-white/[0.06]"
        >
          <span className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity duration-150 group-hover:opacity-0">
            <Image
              src="/corelogo.png"
              alt="Chat Qxt"
              width={60}
              height={60}
              className="rounded-md object-contain"
            />
          </span>

          <PanelLeft className="absolute h-5 w-5 text-white/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        </button>
      </div>
    );
  }

  if (searchOpen) {
    return (
      <div className="px-3 py-3.5">
        <div
          className={[
            "flex h-9 items-center gap-2 rounded-xl border px-3",
            "transition-all duration-150",
            darkMode
              ? "border-white/[0.08] bg-white/[0.035] focus-within:border-white/[0.14]"
              : "border-black/[0.08] bg-black/[0.025] focus-within:border-black/[0.14]",
          ].join(" ")}
        >
          <Search
            className={[
              "h-4 w-4 shrink-0",
              darkMode ? "text-white/35" : "text-slate-400",
            ].join(" ")}
          />

          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onCloseSearch();
              }
            }}
            placeholder="Search chats..."
            className={[
              "min-w-0 flex-1 bg-transparent text-[13px]",
              "outline-none focus:outline-none focus:ring-0",
              darkMode
                ? "text-white/90 placeholder:text-white/30"
                : "text-slate-900 placeholder:text-slate-400",
            ].join(" ")}
          />

          {searchValue ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                darkMode
                  ? "text-white/35 hover:bg-white/[0.06] hover:text-white/70"
                  : "text-slate-400 hover:bg-black/[0.05] hover:text-slate-700",
              ].join(" ")}
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onCloseSearch}
            className={[
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
              darkMode
                ? "text-white/35 hover:bg-white/[0.06] hover:text-white/70"
                : "text-slate-400 hover:bg-black/[0.05] hover:text-slate-700",
            ].join(" ")}
            title="Close search"
            aria-label="Close search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[58px] items-center justify-between px-4">
      <div className="flex items-center gap-2.5 select-none">
  <span
  className="
    font-serif font-bold 
    text-[30px] leading-none 
    bg-gradient-to-b from-[#fff3d6] via-[#f5c563] to-[#c8891f]
    bg-clip-text text-transparent
    tracking-tight
    animate-glow-q
  "
>
  Q
</span>

  <span
    className="
      font-serif 
      text-white/90 
      text-[20px] 
      leading-none 
      tracking-tight
    "
  >
    Chat
  </span>
</div>



      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/70"
          title="Search"
          aria-label="Search"
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
