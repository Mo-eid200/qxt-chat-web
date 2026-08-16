import React from "react";

import type { SessionItem } from "../types";
import { cn } from "../utils/cn";
import { SessionRow } from "../items/SessionRow";

type SessionMenuState =
  | { type: "session"; sid: string }
  | { type: "search" }
  | null;

type ProjectsWithLists = Array<{
  id: string;
  chats?: SessionItem[];
}>;

export type ChatsSectionProps = {
  collapsed?: boolean;
  isLoggedIn: boolean;
  L: Record<string, string>;

  rootList: SessionItem[];
  projectsWithLists: ProjectsWithLists;

  activeSessionId: string | null;

  onOpenSession?: (sid: string) => void;
  onDeleteSession?: (sid: string) => void;
  onRenameSession?: (sid: string) => void;
  onCopySessionLink?: (sid: string) => void;
  onTogglePin?: (sid: string) => void;
  onToggleStar?: (sid: string) => void;
  onToggleUnread?: (sid: string) => void;

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

  onMoveSessionToFolder?: (
  sid: string,
  folderId: string | null
) => void;

  // ─── DnD ─────────────────────────────────────────────

  draggingId: string | null;
  dropOverId: string | null;

  setDraggingId: (id: string | null) => void;
  setDropOverId: (id: string | null) => void;
  setDropSectionOver: (id: string | null) => void;
  setDropProjectOver: (id: string | null) => void;

  // ─── Ordering ────────────────────────────────────────

  orderMap: Record<string, string[]>;

  syncOrderKey: (
    folderId: string | null,
    ids: string[]
  ) => void;

  onReorderFolderSessions?: (
    folderId: string | null,
    ids: string[]
  ) => void;
};

export function ChatsSection({
  isLoggedIn,
  L,

  rootList,
  projectsWithLists,

  activeSessionId,

  onOpenSession,
  onDeleteSession,
  onRenameSession,
  onCopySessionLink,
  onTogglePin,
  onToggleStar,
  onToggleUnread,
  onMoveSessionToFolder,

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

  draggingId,
  dropOverId,

  setDraggingId,
  setDropOverId,
  setDropSectionOver,
  setDropProjectOver,

  orderMap,
  syncOrderKey,
  onReorderFolderSessions,
}: ChatsSectionProps) {
  const emptyBoxClass = cn(
    "px-2 py-2 text-[12px] leading-5",
    darkMode
      ? "text-white/50"
      : "text-slate-500"
  );

  return (
    <section
  className={cn(
    "space-y-0.5 rounded-lg transition-all",
    draggingId &&
      (darkMode
        ? "ring-1 ring-white/10"
        : "ring-1 ring-black/10")
  )}
  onDragOver={(e) => {
    if (!draggingId) return;

    e.preventDefault();
    e.stopPropagation();

    e.dataTransfer.dropEffect = "move";

    setDropSectionOver("chats");
    setDropProjectOver(null);
  }}
  onDragLeave={(e) => {
    const nextTarget = e.relatedTarget as Node | null;

    if (
      nextTarget &&
      e.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setDropSectionOver(null);
  }}
  onDrop={(e) => {
    e.preventDefault();
    e.stopPropagation();

    const sid =
      draggingId ||
      (() => {
        try {
          return (
            e.dataTransfer.getData(
              "application/x-qxt-session"
            ) ||
            e.dataTransfer.getData("text/plain")
          );
        } catch {
          return "";
        }
      })();

    if (sid) {
      // null = General / Unfiled
      void onMoveSessionToFolder?.(sid, null);
    }

    setDraggingId(null);
    setDropOverId(null);
    setDropSectionOver(null);
    setDropProjectOver(null);
  }}
>
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
          <SessionRow
            key={s.id}

            s={s}

            // Root/general session
            folderId={null}

            active={
              activeSessionId === s.id
            }

            darkMode={darkMode}
            rowActive={rowActive}
            rowHover={rowHover}

            onOpenSession={onOpenSession}
            onRenameSession={onRenameSession}
            onDeleteSession={onDeleteSession}
            onCopySessionLink={
              onCopySessionLink
            }
            onTogglePin={onTogglePin}
            onToggleStar={onToggleStar}
            onToggleUnread={onToggleUnread}

            copiedSid={copiedSid}

            draggingId={draggingId}
            dropOverId={dropOverId}

            setDraggingId={
              setDraggingId
            }

            setDropOverId={
              setDropOverId
            }

            setDropSectionOver={
              setDropSectionOver
            }

            setDropProjectOver={
              setDropProjectOver
            }

            setMenu={setMenu}
            menu={menu}

            sessionMenuRef={
              sessionMenuRef
            }

            iconBtn={iconBtn}
            iconTheme={iconTheme}
            menuItem={menuItem}

            L={L}

            orderMap={orderMap}

            rootList={rootList}

            projectsWithLists={
              projectsWithLists
            }

            syncOrderKey={
              syncOrderKey
            }

            onReorderFolderSessions={
              onReorderFolderSessions
            }
          />
        ))
      )}
    </section>
  );
}