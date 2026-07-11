"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Settings,
  Globe,
  HelpCircle,
  ArrowUpCircle,
  Download,
  Gift,
  Info,
  LogOut,
} from "lucide-react";

export type SidebarFooterProps = {
  collapsed: boolean;
  darkMode: boolean;
  avatarLetter: string;
  displayName: string;
  subText: string;
  onAccountClickAction?: () => void;
};

export function SidebarFooter({
  collapsed,
  avatarLetter,
  displayName,
  subText,
  onAccountClickAction,
}: SidebarFooterProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Two-stage mount/visible split — same pattern used for the
  // "Create project" flyout — so the CSS transition actually animates
  // from opacity-0/scale-95 instead of the menu just snapping in.
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Portaled to document.body — the collapsed sidebar (78px wide) has
  // overflow-hidden, so this menu (which needs real width to show its
  // labels) would otherwise get clipped exactly like the "Create
  // project" flyout did before that was fixed the same way.
  useLayoutEffect(() => {
    if (menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: Math.max(rect.width, 220),
      });
      requestAnimationFrame(() => setMenuVisible(true));
    } else {
      setMenuVisible(false);
      const timeout = setTimeout(() => setMenuPos(null), 150);
      return () => clearTimeout(timeout);
    }
  }, [menuOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="border-t border-white/[0.06] px-2 py-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((p) => !p)}
        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-all hover:bg-white/[0.05]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-300/[0.15] text-xs font-bold text-amber-200">
          {avatarLetter}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-white/85">
                {displayName}
              </div>
              <div className="truncate text-[11px] text-white/40">{subText}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/30" />
          </>
        )}
      </button>

      {menuOpen && menuPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className={`fixed z-50 min-w-[220px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1012]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition-all duration-150 ease-out ${
                menuVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{
                bottom: menuPos.bottom,
                left: menuPos.left,
                width: menuPos.width,
                transformOrigin: "left bottom",
              }}
            >
              <div className="border-b border-white/[0.06] px-3 py-2.5 text-xs text-white/40 truncate">
                {subText}
              </div>

              <MenuItem
                icon={<Settings className="h-3.5 w-3.5" />}
                label="Settings"
                onClick={() => {
                  setMenuOpen(false);
                  onAccountClickAction?.();
                }}
              />
              <MenuItem icon={<Globe className="h-3.5 w-3.5" />} label="Language" />
              <MenuItem icon={<HelpCircle className="h-3.5 w-3.5" />} label="Get help" />

              <div className="my-1 border-t border-white/[0.06]" />

              <MenuItem icon={<ArrowUpCircle className="h-3.5 w-3.5" />} label="Upgrade plan" />
              <MenuItem icon={<Download className="h-3.5 w-3.5" />} label="Get apps and extensions" />
              <MenuItem icon={<Gift className="h-3.5 w-3.5" />} label="Gift ChatQXT" />
              <MenuItem icon={<Info className="h-3.5 w-3.5" />} label="Learn more" />

              <div className="my-1 border-t border-white/[0.06]" />

              <MenuItem icon={<LogOut className="h-3.5 w-3.5" />} label="Log out" />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-white/70 transition-all hover:bg-white/[0.05] hover:text-white"
    >
      {icon}
      {label}
    </button>
  );
}
