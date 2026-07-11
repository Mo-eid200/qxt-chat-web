import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  MoreHorizontal,
  GripVertical,
} from "lucide-react";
import { cn } from "../utils/cn";
import { safeTitle } from "../utils/safeTitle";
import { SessionMenu } from "./SessionMenu";
import type { SessionItem } from "../types";

type ProjectsWithLists = Array<{
  id: string;
  chats?: SessionItem[];
}>;

export type SessionMenuState =
  | { type: "session"; sid: string }
  | { type: "search" }
  | null;

export type SessionRowProps = {
  s: SessionItem;
  folderId: string | null;
  active: boolean;
  darkMode: boolean;
  rowActive: string;
  rowHover: string;
  onOpenSession?: (sid: string) => void;
  onRenameSession?: (sid: string) => void;
  onDeleteSession?: (sid: string) => void;
  onCopySessionLink?: (sid: string) => void;
  copiedSid: string | null;
  draggingId: string | null;
  dropOverId: string | null;
  setDraggingId: (
    id: string | null
  ) => void;
  setDropOverId: (
    id: string | null
  ) => void;
  setDropSectionOver: (
    v: string | null
  ) => void;
  setDropProjectOver: (
    v: string | null
  ) => void;
  setMenu: (m: SessionMenuState) => void;
  menu: SessionMenuState;
  sessionMenuRef: React.RefObject<HTMLDivElement | null>;
  iconBtn: string;
  iconTheme: string;
  menuItem: string;
  L: Record<string, string>;
  orderMap: Record<string, string[]>;
  rootList: SessionItem[];
  projectsWithLists: ProjectsWithLists;
  syncOrderKey: (
    folderId: string | null,
    ids: string[]
  ) => void;
  onReorderFolderSessions?: (
    folderId: string | null,
    ids: string[]
  ) => void;
};

export function SessionRow({
  s,
  folderId,
  active,
  darkMode,
  rowActive,
  rowHover,
  onOpenSession,
  onRenameSession,
  onDeleteSession,
  onCopySessionLink,
  copiedSid,
  draggingId,
  dropOverId,
  setDraggingId,
  setDropOverId,
  setDropSectionOver,
  setDropProjectOver,
  setMenu,
  menu,
  sessionMenuRef,
  iconBtn,
  iconTheme,
  menuItem,
  L,
  rootList,
  projectsWithLists,
  syncOrderKey,
  onReorderFolderSessions,
}: SessionRowProps) {
  const title = safeTitle(s);
  const isDragging = draggingId === s.id;
  const isDropOver =
    !!dropOverId &&
    dropOverId === s.id &&
    !!draggingId &&
    draggingId !== s.id;
  const menuOpen =
    menu?.type === "session" &&
    menu.sid === s.id;

  // The "..." menu is portaled to document.body — the sidebar's
  // overflow-hidden container would otherwise clip it (same fix
  // applied to SidebarFooter's profile menu and the "Create project"
  // flyout). Position is measured from the trigger button so the menu
  // always opens right next to it, regardless of scroll position.
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useLayoutEffect(() => {
    if (menuOpen && menuTriggerRef.current) {
      const rect = menuTriggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        left: rect.right + 8,
      });
      requestAnimationFrame(() => setMenuVisible(true));
    } else {
      setMenuVisible(false);
      const timeout = setTimeout(() => setMenuPos(null), 150);
      return () => clearTimeout(timeout);
    }
  }, [menuOpen]);

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    const draggedSessionId =
      draggingId ||
      (() => {
        try {
          return e.dataTransfer.getData(
            "text/plain"
          );
        } catch {
          return "";
        }
      })();
    if (
      !draggedSessionId ||
      draggedSessionId === s.id
    ) {
      return;
    }
    const sourceList =
      folderId === null
        ? rootList
        : (
            projectsWithLists.find(
              (f) => f.id === folderId
            )?.chats ?? []
          );
    const baseIds = sourceList.map(
      (item) => item.id
    );
    const withoutDragged =
      baseIds.filter(
        (id) => id !== draggedSessionId
      );
    const targetIndex =
      withoutDragged.indexOf(s.id);
    if (targetIndex < 0) {
      setDraggingId(null);
      setDropOverId(null);
      return;
    }
    const nextIds = [
      ...withoutDragged.slice(
        0,
        targetIndex
      ),
      draggedSessionId,
      ...withoutDragged.slice(
        targetIndex
      ),
    ];
    syncOrderKey(folderId, nextIds);
    onReorderFolderSessions?.(
      folderId,
      nextIds
    );
    setDraggingId(null);
    setDropOverId(null);
    setDropSectionOver(null);
    setDropProjectOver(null);
  };

  return (
    <div
      className={cn(
        "group relative",
        isDragging && "opacity-60"
      )}
      draggable
      onDragStart={(
        e: React.DragEvent<HTMLDivElement>
      ) => {
        setDraggingId(s.id);
        try {
          e.dataTransfer.setData(
            "text/plain",
            s.id
          );
        } catch {
          //
        }
      }}
      onDragEnd={() => {
        setDraggingId(null);
        setDropOverId(null);
        setDropSectionOver(null);
        setDropProjectOver(null);
      }}
      onDragOver={(
        e: React.DragEvent<HTMLDivElement>
      ) => {
        e.preventDefault();
        if (
          draggingId &&
          draggingId !== s.id
        ) {
          setDropOverId(s.id);
        }
      }}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150",
          darkMode
            ? "text-white/88"
            : "text-slate-900",
          active ? rowActive : rowHover,
          isDropOver &&
            (darkMode
              ? "ring-1 ring-violet-400/25"
              : "ring-1 ring-violet-300/40")
        )}
      >
        <div
          className={cn(
            "hidden md:flex items-center justify-center shrink-0",
            "opacity-0 group-hover:opacity-60 transition-opacity",
            "cursor-grab active:cursor-grabbing"
          )}
          title={L.drag}
          aria-hidden="true"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <button
          className="min-w-0 flex-1 flex items-center gap-2 text-left"
          onClick={() =>
            onOpenSession?.(s.id)
          }
          type="button"
          title={title}
        >
          <div
            className={cn(
              "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
              active
                ? darkMode
                  ? "bg-white/[0.10] text-white"
                  : "bg-black/[0.06] text-slate-900"
                : darkMode
                  ? "bg-white/[0.04] text-white/65"
                  : "bg-black/[0.04] text-slate-600"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium leading-5">
              {title}
            </div>
            <div
              className={cn(
                "truncate text-[10.5px] leading-4",
                darkMode
                  ? "text-white/28"
                  : "text-slate-400"
              )}
            >
              Recent conversation
            </div>
          </div>
        </button>
        <button
          ref={menuTriggerRef}
          type="button"
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
            "h-7 w-7"
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
                onCopySessionLink={
                  onCopySessionLink
                }
                onRenameSession={
                  onRenameSession
                }
                onDeleteSession={
                  onDeleteSession
                }
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
