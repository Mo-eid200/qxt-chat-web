import React from "react";
import { createPortal } from "react-dom";
import {
  Folder,
  FolderOpen,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";

import { cn } from "../utils/cn";
import type {
  ProjectFolder,
  SessionItem,
} from "../types";

type ProjectFolderBlockProps = {
  f: ProjectFolder;
  isOpen: boolean;
  dropOn: boolean;
  darkMode: boolean;
  rowHover: string;
  isLoggedIn: boolean;
  onAccountClick?: () => void;
  createChatInFolder: (
    id: string | null
  ) => void;
  L: Record<string, string>;
  setProjectOpen: React.Dispatch<
    React.SetStateAction<
      Record<string, boolean>
    >
  >;
  setDropProjectOver: (
    id: string | null
  ) => void;
  setDraggingId: (
    id: string | null
  ) => void;
  setDropOverId: (
    id: string | null
  ) => void;
  setDropSectionOver: (
    v: string | null
  ) => void;
  onMoveSessionToFolder?: (
    sid: string,
    folderId: string | null
  ) => void;
  draggingId: string | null;
  dropProjectOver: string | null;
  q: string;
  list: SessionItem[];
  emptyBox: string;
  rootList: SessionItem[];
  selected?: boolean;
  onSelectProject?: (
    projectId: string
  ) => void;
  onRenameProject?: (
    projectId: string,
    currentTitle: string
  ) => void;
  onDeleteProject?: (
    projectId: string
  ) => void;
  onShareProject?: (
    projectId: string
  ) => void;
  SessionRowComponent
  : React.ComponentType<{
    s: SessionItem;
    folderId: string | null;
  }>;
};

function ProjectFolderBlockComponent({
  f,
  isOpen,
  darkMode,
  isLoggedIn,
  onAccountClick,
  createChatInFolder,
  L,
  setProjectOpen,
  setDropProjectOver,
  setDraggingId,
  setDropOverId,
  setDropSectionOver,
  onMoveSessionToFolder,
  draggingId,
  dropProjectOver,
  q,
  list,
  selected = false,
  onSelectProject,
  onRenameProject,
  onDeleteProject,
  onShareProject,
  SessionRowComponent,
}: ProjectFolderBlockProps) {
  const [menuOpen, setMenuOpen] =
    React.useState(false);

  const [menuPos, setMenuPos] =
    React.useState<{
      top: number;
      left: number;
    } | null>(null);

  const menuRef =
    React.useRef<HTMLDivElement>(null);

  const isDropActive =
    dropProjectOver === f.id;

  React.useEffect(() => {
    if (!menuOpen) return;

    const onDocClick = (
      e: MouseEvent
    ) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setMenuOpen(false);
        setMenuPos(null);
      }
    };

    document.addEventListener(
      "mousedown",
      onDocClick
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        onDocClick
      );
  }, [menuOpen]);

  const rowClass = cn(
    "group w-full cursor-pointer rounded-xl border px-2.5 py-1.5 transition-all duration-150",
    darkMode
      ? "border-transparent text-white/88 hover:border-white/[0.08] hover:bg-white/[0.02]"
      : "border-transparent text-slate-800 hover:border-black/[0.08] hover:bg-black/[0.02]",
    isOpen &&
      (darkMode
        ? "border-indigo-300/28 bg-indigo-500/[0.14] text-white"
        : "border-indigo-300 bg-indigo-100 text-slate-900"),
    selected &&
      (darkMode
        ? "border-indigo-300/34 text-white"
        : "border-indigo-300 text-slate-900"),
    isDropActive &&
      (darkMode
        ? "border-indigo-300/42 bg-indigo-500/[0.10]"
        : "border-indigo-300 bg-indigo-50")
  );

  const actionBtn = cn(
    "h-7 w-7 shrink-0 rounded-lg flex items-center justify-center transition",
    darkMode
      ? "text-white/42 hover:text-white/85 hover:bg-white/[0.06]"
      : "text-slate-500 hover:text-slate-900 hover:bg-black/[0.05]"
  );

  const menuClass = cn(
    "min-w-[190px] rounded-xl border p-1 shadow-xl",
    darkMode
      ? "border-white/[0.08] bg-[#16171b] text-white"
      : "border-black/10 bg-white text-slate-900"
  );

  const menuItemClass = cn(
    "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-left transition",
    darkMode
      ? "hover:bg-white/[0.06]"
      : "hover:bg-black/[0.05]"
  );

  const handleToggle = () => {
    onSelectProject?.(f.id);
    setProjectOpen((p) => ({
      ...p,
      [f.id]: !isOpen,
    }));
  };

  return (
    <div className="space-y-1">
      <div
        className={rowClass}
        onClick={handleToggle}
        onDragOver={(
  e: React.DragEvent<HTMLDivElement>
) => {
  e.preventDefault();
  e.stopPropagation();

  e.dataTransfer.dropEffect = "move";

  setDropProjectOver(f.id);
  setDropSectionOver(null);
  setDropOverId(null);
}}
onDragLeave={(
  e: React.DragEvent<HTMLDivElement>
) => {
  const nextTarget =
    e.relatedTarget as Node | null;

  if (
    nextTarget &&
    e.currentTarget.contains(nextTarget)
  ) {
    return;
  }

  setDropProjectOver(null);
}}
        onDrop={(
          e: React.DragEvent<HTMLDivElement>
        ) => {
          e.preventDefault();
          e.stopPropagation();

          const sid =
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

          if (sid) {
            onSelectProject?.(f.id);
            onMoveSessionToFolder?.(
              sid,
              f.id
            );
          }

          setDraggingId(null);
          setDropOverId(null);
          setDropSectionOver(null);
          setDropProjectOver(null);
        }}
        title={L.dropToMove}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-7 w-7 rounded-lg shrink-0 flex items-center justify-center",
              darkMode
                ? "text-white/75"
                : "text-slate-700"
            )}
          >
            {isOpen ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className="min-w-0 flex flex-1 cursor-pointer items-center gap-2 text-left"
          >
            <span
              className={cn(
                "truncate text-[13px] font-medium",
                darkMode
                  ? "text-white/92"
                  : "text-slate-900"
              )}
            >
              {f.title}
            </span>

            {list.length > 0 ? (
              <span
                className={cn(
                  "shrink-0 text-[11px]",
                  darkMode
                    ? "text-white/35"
                    : "text-slate-500"
                )}
              >
                {list.length}
              </span>
            ) : null}
          </button>

          <button
  type="button"
  className={cn(
    actionBtn,
    "opacity-0 group-hover:opacity-100 transition-opacity"
  )}
  onClick={(e) => {
    e.stopPropagation();

    if (!isLoggedIn) {
      onAccountClick?.();
      return;
    }

    onSelectProject?.(f.id);
    createChatInFolder(f.id);
  }}
  title={L.newChatInProject}
  aria-label={L.newChatInProject}
>
  <MessageSquarePlus className="w-4 h-4" />
</button>

          <div
            className="relative shrink-0"
            ref={menuRef}
          >
            <button
  type="button"
  className={cn(
    actionBtn,
    menuOpen
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100 transition-opacity"
  )}
  onClick={(e) => {
    e.stopPropagation();

    if (menuOpen) {
      setMenuOpen(false);
      setMenuPos(null);
      return;
    }

    const rect =
      e.currentTarget.getBoundingClientRect();

    setMenuPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
    setMenuOpen(true);
  }}
  title={L.more || "More"}
  aria-label={L.more || "More"}
>
  <MoreHorizontal className="w-4 h-4" />
</button>
          </div>
        </div>
      </div>

      {menuOpen &&
      menuPos &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className={cn(
                "fixed z-[200] -translate-y-1/2",
                menuClass
              )}
              style={{
                top: menuPos.top,
                left: menuPos.left,
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  setMenuOpen(false);
                  setMenuPos(null);
                  onRenameProject?.(
                    f.id,
                    f.title
                  );
                }}
              >
                <Pencil className="w-4 h-4" />
                <span>
                  {L.renameProject ||
                    "Rename project"}
                </span>
              </button>

              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  setMenuOpen(false);
                  setMenuPos(null);
                  onShareProject?.(f.id);
                }}
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {L.shareProject ||
                    "Share project"}
                </span>
              </button>

              <button
                type="button"
                className={cn(
                  menuItemClass,
                  darkMode
                    ? "text-rose-300"
                    : "text-rose-600"
                )}
                onClick={() => {
                  setMenuOpen(false);
                  setMenuPos(null);
                  onDeleteProject?.(f.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {L.deleteProject ||
                    "Delete project"}
                </span>
              </button>
            </div>,
            document.body
          )
        : null}

      {isOpen && (
        <div className="mt-1 space-y-0">
          {!isLoggedIn ? (
            <div
              className={cn(
                "px-2 py-1 text-[12px]",
                darkMode
                  ? "text-white/42"
                  : "text-slate-500"
              )}
            >
              {L.signInToView}
            </div>
          ) : list.length === 0 ? (
            <div
              className={cn(
                "px-2 py-1 text-[12px]",
                darkMode
                  ? "text-white/38"
                  : "text-slate-500"
              )}
            >
              {q
                ? L.noResults
                : "No conversations yet."}
            </div>
          ) : (
            list.map((s) => (
              <SessionRowComponent
                key={s.id}
                s={s}
                folderId={f.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
export const ProjectFolderBlock = React.memo(ProjectFolderBlockComponent);