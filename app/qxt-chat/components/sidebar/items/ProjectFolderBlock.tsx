import React from "react";
import {
  Folder,
  FolderOpen,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { cn } from "../utils/cn";
import type {
  ProjectFolder,
  SessionItem,
} from "../types";

function folderBadge(
  kind?: string,
  darkMode?: boolean
): string {
  const k = kind || "project";

  if (darkMode) {
    if (k === "project") {
      return "bg-indigo-400/[0.10] text-indigo-100 border border-indigo-400/20";
    }

    if (k === "library") {
      return "bg-fuchsia-400/[0.10] text-fuchsia-100 border border-fuchsia-400/20";
    }

    if (k === "code") {
      return "bg-amber-400/[0.10] text-amber-100 border border-amber-400/20";
    }

    return "bg-emerald-400/[0.10] text-emerald-100 border border-emerald-400/20";
  }

  if (k === "project") {
    return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  }

  if (k === "library") {
    return "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200";
  }

  if (k === "code") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 border border-emerald-200";
}

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
  SessionRowComponent: React.ComponentType<{
    s: SessionItem;
    folderId: string | null;
  }>;
};

export function ProjectFolderBlock({
  f,
  isOpen,
  darkMode,
  rowHover,
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
  emptyBox,
  selected = false,
  onSelectProject,
  SessionRowComponent,
}: ProjectFolderBlockProps) {
  const isDropActive =
    dropProjectOver === f.id;

  const cardClass = cn(
    "rounded-2xl border transition-all duration-200 overflow-hidden",
    darkMode
      ? "border-white/[0.06] bg-white/[0.03]"
      : "border-black/[0.06] bg-black/[0.03]",
    selected &&
      (darkMode
        ? "ring-2 ring-indigo-400/20 bg-indigo-500/[0.06]"
        : "ring-2 ring-indigo-300/60 bg-indigo-50/70"),
    isDropActive &&
      (darkMode
        ? "ring-2 ring-indigo-400/25 bg-indigo-400/[0.05]"
        : "ring-2 ring-indigo-300 bg-indigo-50/80")
  );

  const headerClass = cn(
    "w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all",
    rowHover
  );

  const handleSelectAndToggle = () => {
    onSelectProject?.(f.id);

    setProjectOpen((p) => ({
      ...p,
      [f.id]: !isOpen,
    }));
  };

  return (
    <div className={cardClass}>
      <div
        className={headerClass}
        onClick={handleSelectAndToggle}
        onDragOver={(
          e: React.DragEvent<HTMLDivElement>
        ) => {
          e.preventDefault();
          setDropProjectOver(f.id);
        }}
        onDragLeave={() =>
          setDropProjectOver(null)
        }
        onDrop={(
          e: React.DragEvent<HTMLDivElement>
        ) => {
          e.preventDefault();

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
        <div
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
            darkMode
              ? "bg-indigo-400/[0.12] text-indigo-200"
              : "bg-indigo-100 text-indigo-700"
          )}
        >
          {isOpen ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "truncate text-[13px] font-semibold leading-5",
                darkMode
                  ? "text-white/92"
                  : "text-slate-900"
              )}
            >
              {f.title}
            </div>

            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                folderBadge(
                  f.kind,
                  darkMode
                )
              )}
            >
              {(
                f.kind || "project"
              ).toUpperCase()}
            </span>
          </div>

          <div
            className={cn(
              "mt-0.5 text-[11px]",
              darkMode
                ? "text-white/40"
                : "text-slate-500"
            )}
          >
            {list.length > 0
              ? `${list.length} chats`
              : "No chats yet"}
          </div>
        </div>

        <button
          type="button"
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center transition active:scale-[0.98]",
            darkMode
              ? "text-white/72 hover:bg-white/[0.06]"
              : "text-slate-700 hover:bg-black/[0.05]"
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
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center transition active:scale-[0.98]",
            darkMode
              ? "text-white/72 hover:bg-white/[0.06]"
              : "text-slate-700 hover:bg-black/[0.05]"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectProject?.(f.id);
            setProjectOpen((p) => ({
              ...p,
              [f.id]: !isOpen,
            }));
          }}
          aria-label={
            isOpen
              ? L.collapse
              : L.expand
          }
          title={
            isOpen
              ? L.collapse
              : L.expand
          }
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="px-3 pb-3">
          <div
            className={cn(
              "ml-4 border-l pl-3 space-y-1",
              darkMode
                ? "border-white/[0.06]"
                : "border-black/[0.06]"
            )}
          >
            {!isLoggedIn ? (
              <div className={emptyBox}>
                {L.signInToView}
              </div>
            ) : list.length === 0 ? (
              <div className={emptyBox}>
                {q
                  ? L.noResults
                  : L.noSessions}
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
        </div>
      )}
    </div>
  );
}