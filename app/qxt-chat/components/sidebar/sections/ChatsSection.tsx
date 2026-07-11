import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MoreHorizontal,
  GripVertical,
} from "lucide-react";

import type { SessionItem } from "../types";
import { cn } from "../utils/cn";
import { safeTitle } from "../utils/safeTitle";
import { SessionMenu } from "../items/SessionMenu";

type SessionMenuState =
  | { type: "session"; sid: string }
  | { type: "search" }
  | null;

export type ChatsSectionProps = {
  collapsed?: boolean;
  isLoggedIn: boolean;
  L: Record<string, string>;
  rootList: SessionItem[];
  activeSessionId: string | null;
  onOpenSession?: (sid: string) => void;
  onDeleteSession?: (sid: string) => void;
  onRenameSession?: (sid: string) => void;
  onCopySessionLink?: (sid: string) => void;
  copiedSid: string | null;
  menu: SessionMenuState;
  setMenu: (m: SessionMenuState) => void;
  sessionMenuRef: React.RefObject<HTMLDivElement | null>;
  q: string;
  rowActive: string;
  rowHover: string;
  darkMode: boolean;
  iconBtn: string;
  iconTheme: string;
  menuItem: string;
  onNewChat?: () => void;
};

export function ChatsSection({
  isLoggedIn,
  L,
  rootList,
  activeSessionId,
  onOpenSession,
  onDeleteSession,
  onRenameSession,
  onCopySessionLink,
  copiedSid,
  setMenu,
  menu,
  sessionMenuRef,
  q,
  rowActive,
  rowHover,
  darkMode,
  iconBtn,
  iconTheme,
  menuItem,
}: ChatsSectionProps) {
  const emptyBoxClass = cn(
    "rounded-lg border px-3 py-2.5 text-[12px] leading-5",
    darkMode
      ? "border-white/[0.06] bg-white/[0.02] text-white/55"
      : "border-black/[0.06] bg-black/[0.02] text-slate-500"
  );

  return (
    <section className="space-y-1">
      <div className="space-y-0.5">
        {!isLoggedIn ? (
          <div className={emptyBoxClass}>
            {L.signInToView}
          </div>
        ) : rootList.length === 0 ? (
          <div className={emptyBoxClass}>
            {q ? L.noResults : L.noSessions}
          </div>
        ) : (
          rootList.map((s) => (
            <RootSessionRow
              key={s.id}
              s={s}
              active={activeSessionId === s.id}
              darkMode={darkMode}
              rowActive={rowActive}
              rowHover={rowHover}
              onOpenSession={onOpenSession}
              onRenameSession={onRenameSession}
              onDeleteSession={onDeleteSession}
              onCopySessionLink={onCopySessionLink}
              copiedSid={copiedSid}
              setMenu={setMenu}
              menu={menu}
              sessionMenuRef={sessionMenuRef}
              iconBtn={iconBtn}
              iconTheme={iconTheme}
              menuItem={menuItem}
              L={L}
            />
          ))
        )}
      </div>
    </section>
  );
}

type RootSessionRowProps = {
  s: SessionItem;
  active: boolean;
  darkMode: boolean;
  rowActive: string;
  rowHover: string;
  onOpenSession?: (sid: string) => void;
  onRenameSession?: (sid: string) => void;
  onDeleteSession?: (sid: string) => void;
  onCopySessionLink?: (sid: string) => void;
  copiedSid: string | null;
  setMenu: (m: SessionMenuState) => void;
  menu: SessionMenuState;
  sessionMenuRef: React.RefObject<HTMLDivElement | null>;
  iconBtn: string;
  iconTheme: string;
  menuItem: string;
  L: Record<string, string>;
};

function RootSessionRow({
  s,
  active,
  darkMode,
  rowActive,
  rowHover,
  onOpenSession,
  onRenameSession,
  onDeleteSession,
  onCopySessionLink,
  copiedSid,
  setMenu,
  menu,
  sessionMenuRef,
  iconBtn,
  iconTheme,
  menuItem,
  L,
}: RootSessionRowProps) {
  const title = safeTitle(s);

  const menuOpen =
    menu?.type === "session" &&
    menu.sid === s.id;


  // Portaled to document.body — same fix as SessionRow.tsx/
  // SidebarFooter.tsx/ProjectsSection.tsx's flyouts, since the
  // sidebar's overflow-hidden clips anything positioned absolute
  // inside it, and this menu was previously using left-2 right-2
  // (stretching almost the full sidebar width) instead of a properly
  // positioned, sidebar-independent flyout.
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useLayoutEffect(() => {
    if (menuOpen && menuTriggerRef.current) {
      const rect = menuTriggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, left: rect.right + 8 });
      requestAnimationFrame(() => setMenuVisible(true));
    } else {
      setMenuVisible(false);
      const timeout = setTimeout(() => setMenuPos(null), 150);
      return () => clearTimeout(timeout);
    }
  }, [menuOpen]);
  return (
    <div className="group relative">
      <div
        className={cn(
          "relative flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors duration-150",
          darkMode
            ? "text-white/88"
            : "text-slate-900",
          active ? rowActive : rowHover
        )}
      >
        <div
          className={cn(
            "hidden md:flex items-center justify-center shrink-0",
            "opacity-0 group-hover:opacity-45 transition-opacity",
            "cursor-grab active:cursor-grabbing"
          )}
          title={L.drag}
          aria-hidden="true"
        >
          <GripVertical className="w-3 h-3" />
        </div>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpenSession?.(s.id)}
          title={title}
        >
          <div className="truncate text-[12.5px] font-medium leading-5">
            {title}
          </div>
        </button>

        <button
          type="button"
          ref={menuTriggerRef}
          onClick={() =>
            setMenu(
              menuOpen
                ? null
                : {
                    type: "session",
                    sid: s.id,
                  }
            )
          }
          className={cn(
            "shrink-0 transition-all",
            menuOpen
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
            iconBtn,
            iconTheme,
            "h-6 w-6"
          )}
          aria-label={L.options}
          title={L.options}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {menuOpen && menuPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={sessionMenuRef}
              className={cn(
                "fixed z-[9999] w-[220px] flex flex-col",
                "rounded-2xl border p-2 transition-all duration-150 ease-out",
                menuVisible
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95",
                "border-white/[0.08] bg-[#0f1012]/95 backdrop-blur-2xl text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
              )}
              style={{
                top: menuPos.top,
                left: menuPos.left,
                transformOrigin: "top right",
              }}
            >
              <SessionMenu
                sId={s.id}
                copiedSid={copiedSid}
                onCopySessionLink={onCopySessionLink}
                onRenameSession={onRenameSession}
                onDeleteSession={onDeleteSession}
                setMenu={setMenu}
                menuItem={menuItem}
                L={L}
                darkMode={darkMode}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}