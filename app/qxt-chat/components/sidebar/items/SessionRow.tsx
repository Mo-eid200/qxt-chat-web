import React, {
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

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
  onTogglePin?: (sid: string) => void;
  onToggleStar?: (sid: string) => void;
  onToggleUnread?: (sid: string) => void;
  copiedSid: string | null;
  draggingId: string | null;
  dropOverId: string | null;
  setDraggingId: (id: string | null) => void;
  setDropOverId: (id: string | null) => void;
  setDropSectionOver: (v: string | null) => void;
  setDropProjectOver: (v: string | null) => void;
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

function SessionRowComponent({
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
  onTogglePin,
  onToggleStar,
  onToggleUnread,
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

  const findSessionFolder = (
  sid: string
): string | null | undefined => {
  if (rootList.some((item) => item.id === sid)) {
    return null;
  }

  for (const project of projectsWithLists) {
    if (
      (project.chats ?? []).some(
        (item) => item.id === sid
      )
    ) {
      return project.id;
    }
  }

  return undefined;
};

  const isDragging = draggingId === s.id;
  const isDropOver =
    !!dropOverId &&
    dropOverId === s.id &&
    !!draggingId &&
    draggingId !== s.id;

  const menuOpen =
    menu?.type === "session" &&
    menu.sid === s.id;

  const menuTriggerRef =
    useRef<HTMLButtonElement>(null);

  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [menuVisible, setMenuVisible] =
    useState(false);

  useLayoutEffect(() => {
    if (menuOpen && menuTriggerRef.current) {
      const rect =
        menuTriggerRef.current.getBoundingClientRect();

      setMenuPos({
        top: rect.bottom + 6,
        left: rect.right + 8,
      });

      requestAnimationFrame(() =>
        setMenuVisible(true)
      );
    } else {
      setMenuVisible(false);

      const timeout = setTimeout(
        () => setMenuPos(null),
        150
      );

      return () => clearTimeout(timeout);
    }
  }, [menuOpen]);

  const handleDrop = (
  e: React.DragEvent<HTMLDivElement>
) => {
  e.preventDefault();
  e.stopPropagation();

  const draggedSessionId =
    draggingId ||
    (() => {
      try {
        return (
          e.dataTransfer.getData(
            "application/x-qxt-session"
          ) ||
          e.dataTransfer.getData(
            "text/plain"
          )
        );
      } catch {
        return "";
      }
    })();

  if (
    !draggedSessionId ||
    draggedSessionId === s.id
  ) {
    setDraggingId(null);
    setDropOverId(null);
    setDropSectionOver(null);
    setDropProjectOver(null);
    return;
  }

  const sourceFolderId =
    findSessionFolder(draggedSessionId);

  const targetFolderId = folderId;

  // Cross-container drop should be handled as MOVE,
  // not as reorder.
  if (sourceFolderId !== targetFolderId) {
    setDraggingId(null);
    setDropOverId(null);
    setDropSectionOver(null);
    setDropProjectOver(null);
    return;
  }

  // Same container => reorder.
  const targetList =
    targetFolderId === null
      ? rootList
      : (
          projectsWithLists.find(
            (project) =>
              project.id === targetFolderId
          )?.chats ?? []
        );

  const baseIds = targetList.map(
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
    setDropSectionOver(null);
    setDropProjectOver(null);
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

  syncOrderKey(
    targetFolderId,
    nextIds
  );

  void onReorderFolderSessions?.(
    targetFolderId,
    nextIds
  );

  setDraggingId(null);
  setDropOverId(null);
  setDropSectionOver(null);
  setDropProjectOver(null);
};

  return (
    <div
      // Full-width row (was inline-block, which sized each row to
      // its own text and made the list look uneven). Fixed height
      // (h-8) so every row — sessions and folders alike — lines up
      // consistently, matching ProjectFolderBlock's py-1.5 rhythm.
      className={cn(
        "group relative w-full",
        isDragging && "opacity-60"
      )}
      draggable
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
  const sid = String(s.id);

  // Tell the browser this is a real move operation.
  e.dataTransfer.effectAllowed = "move";

  // QXT-specific MIME type for our own drop targets.
  e.dataTransfer.setData(
    "application/x-qxt-session",
    sid
  );

  // Fallback for browsers / generic drop targets.
  e.dataTransfer.setData(
    "text/plain",
    sid
  );

  // React state is useful for visual feedback/reordering,
  // but DataTransfer remains the source of truth during DnD.
  setDraggingId(sid);
}}
      onDragEnd={() => {
        setDraggingId(null);
        setDropOverId(null);
        setDropSectionOver(null);
        setDropProjectOver(null);
      }}
      onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();

  e.dataTransfer.dropEffect = "move";

  if (draggingId && draggingId !== s.id) {
    setDropOverId(s.id);
    setDropSectionOver(null);
    setDropProjectOver(null);
  }
}}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "relative flex h-8 w-full items-center gap-2 rounded-lg px-2 transition-colors duration-150",
          darkMode
            ? "text-white/80"
            : "text-slate-900",
          active ? rowActive : rowHover,
          isDropOver &&
            (darkMode
              ? "ring-1 ring-violet-400/25"
              : "ring-1 ring-violet-300/40")
        )}
      >
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpenSession?.(s.id)}
          type="button"
          title={title}
        >
          <div className="truncate text-[13px] leading-5">
            {title}
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
            "h-6 w-6 shrink-0 rounded-md flex items-center justify-center transition-all",
            menuOpen
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
            iconBtn,
            iconTheme
          )}
          aria-label={L.options}
          title={L.options}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {menuOpen &&
      menuPos &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              ref={sessionMenuRef}
              className={cn(
                "fixed z-[9999] flex w-[220px] flex-col",
                "rounded-2xl border p-2 transition-all duration-150 ease-out",
                menuVisible
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0",
                "border-white/[0.08] bg-[#0f1012]/95 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
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
                onTogglePin={onTogglePin}
                onToggleStar={onToggleStar}
                onToggleUnread={onToggleUnread}

                pinned={Boolean(s.pinned)}
                starred={Boolean(s.starred)}
                markedUnread={Boolean(s.marked_unread)}
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
export const SessionRow = React.memo(SessionRowComponent);
