import React from "react";
import { createPortal } from "react-dom";
import {
  FolderOpen,
  Plus,
} from "lucide-react";

import type {
  ProjectFolder,
  SessionItem,
} from "../types";
import { cn } from "../utils/cn";
import { ProjectFolderBlock } from "../items/ProjectFolderBlock";
import { SessionRow } from "../items/SessionRow";

type SessionMenuState =
  | { type: "session"; sid: string }
  | { type: "search" }
  | null;

type ProjectsWithLists = Array<
  ProjectFolder & {
    chats: SessionItem[];
  }
>;

type ProjectsSectionProps = {
  isLoggedIn: boolean;
  L: Record<string, string>;
  projectsWithLists: ProjectsWithLists;
  projectOpen: Record<string, boolean>;
  creatingProject: boolean;
  projectDraft: string;
  setProjectDraft: (val: string) => void;
  submitCreateProject: () => void;
  closeCreateProject: () => void;
  rowHover: string;
  darkMode: boolean;
  miniIconBtn: string;
  miniIconTheme: string;
  iconBtn?: string;
  iconTheme?: string;
  menuItem?: string;
  rowActive?: string;
  q: string;
  textMuted: string;
  rootList: SessionItem[];
  onAccountClick?: () => void;
  openCreateProject?: () => void;
  createChatInFolder: (
    id: string | null
  ) => void;
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
  copiedSid?: string | null;
  menu?: SessionMenuState;
  setMenu?: (m: SessionMenuState) => void;
  sessionMenuRef?: React.RefObject<HTMLDivElement | null>;
  onOpenSession?: (sid: string) => void;
  onDeleteSession?: (sid: string) => void;
  onRenameSession?: (sid: string) => void;
  onCopySessionLink?: (sid: string) => void;
  orderMap?: Record<string, string[]>;
  syncOrderKey?: (
    folderId: string | null,
    ids: string[]
  ) => void;
  onReorderFolderSessions?: (
    folderId: string | null,
    ids: string[]
  ) => void;
    selectedProjectId?: string | null;
  onSelectProject?: (
    projectId: string
  ) => void;

};

function CreateProjectInline({
  darkMode,
  value,
  setValue,
  onSubmit,
  onCancel,
  miniIconBtn,
  miniIconTheme,
  textMuted,
  L,
}: {
  darkMode: boolean;
  value: string;
  setValue: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  miniIconBtn: string;
  miniIconTheme: string;
  textMuted: string;
  L: Record<string, string>;
}) {
  // Unified with the rest of the sidebar: same row height/padding as
  // ScopeButton (px-3 py-2.5, rounded-2xl), amber accent instead of
  // indigo, no helper text line underneath — this is meant to feel
  // like every other single-line row, just with an inline input.
  // No border/background here — the parent flyout card (in
  // ProjectsSection.tsx) already provides the single card boundary.
  // Giving this row its own border+bg on top of that produced a
  // "box inside a box" nested look.
  return (
    <div className="w-full flex items-center gap-2.5 px-1 py-1">
      <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 bg-amber-300/[0.14] text-amber-200">
        <FolderOpen className="w-4 h-4" />
      </div>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={L.projectNamePlaceholder || "Project name"}
        className="min-w-0 flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-white/35"
      />
      <button
        type="button"
        className="h-7 px-2.5 rounded-lg text-[12px] font-semibold bg-amber-300 text-black hover:bg-amber-200 transition active:scale-[0.98] disabled:opacity-40"
        onClick={onSubmit}
        disabled={!value.trim()}
        title={L.create}
      >
        {L.create}
      </button>
      <button
        type="button"
        className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white/70"
        onClick={onCancel}
        title={L.cancel}
      >
        ×
      </button>
    </div>
  );
}

function CreateProjectNestedRow({
  darkMode,
  onClick,
  label,
}: {
  darkMode: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left border border-amber-300/15 bg-amber-300/[0.05] text-amber-100 hover:bg-amber-300/[0.08] transition-all duration-200"
    >
      <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 bg-amber-300/[0.14] text-amber-200">
        <Plus className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-5">
          {label}
        </div>
      </div>
    </button>
  );
}

export function ProjectsSection({
  isLoggedIn,
  L,
  projectsWithLists,
  projectOpen,
  creatingProject,
  projectDraft,
  setProjectDraft,
  submitCreateProject,
  closeCreateProject,
  rowHover,
  darkMode,
  miniIconBtn,
  miniIconTheme,
  iconBtn = "",
  iconTheme = "",
  menuItem = "",
  rowActive = "",
  q,
  textMuted,
  rootList,
  onAccountClick,
  openCreateProject,
  createChatInFolder,
  setProjectOpen,
  setDropProjectOver,
  setDraggingId,
  setDropOverId,
  setDropSectionOver,
  onMoveSessionToFolder,
  draggingId,
  dropProjectOver,
  copiedSid = null,
  menu = null,
  setMenu = () => {},
  sessionMenuRef,
  onOpenSession,
  onDeleteSession,
  onRenameSession,
  onCopySessionLink,
  orderMap = {},
  syncOrderKey = () => {},
  onReorderFolderSessions,
  selectedProjectId = null,
  onSelectProject = () => {},
}: ProjectsSectionProps) {
  const emptyBoxClass = cn(
    "rounded-2xl border px-3 py-3 text-[12px] leading-5",
    darkMode
      ? "border-white/[0.06] bg-white/[0.03] text-white/60"
      : "border-black/[0.06] bg-black/[0.03] text-slate-500"
  );

  // The "Create project" flyout is portaled to document.body and
  // positioned via getBoundingClientRect of the trigger row — this is
  // necessary because the sidebar's <aside> has overflow-hidden (so
  // any wider-than-sidebar content, like this 288px-wide flyout,
  // would otherwise get visually clipped at the sidebar's edge no
  // matter what z-index it has).
  const createTriggerRef = React.useRef<HTMLDivElement>(null);
  const [flyoutPos, setFlyoutPos] = React.useState<{ top: number; left: number } | null>(null);
  // Drives the enter/exit motion (fade + scale). Separate from
  // `creatingProject` itself so we can keep the flyout mounted for one
  // extra frame while its exit transition plays out.
  const [flyoutVisible, setFlyoutVisible] = React.useState(false);

  React.useEffect(() => {
    if (creatingProject && createTriggerRef.current) {
      const rect = createTriggerRef.current.getBoundingClientRect();
      setFlyoutPos({ top: rect.top, left: rect.right + 8 });
      // Mount first with visible=false, then flip to true on the next
      // frame so the CSS transition actually animates from the
      // opacity-0/scale-95 starting state instead of snapping in.
      requestAnimationFrame(() => setFlyoutVisible(true));
    } else {
      setFlyoutVisible(false);
      const timeout = setTimeout(() => setFlyoutPos(null), 150);
      return () => clearTimeout(timeout);
    }
  }, [creatingProject]);

  return (
    <div className="relative space-y-2">
      <div ref={createTriggerRef}>
        <CreateProjectNestedRow
          darkMode={darkMode}
          onClick={openCreateProject}
          label={
            L.createProject ||
            "Create project"
          }
        />
      </div>

      {creatingProject && flyoutPos && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={closeCreateProject}
              />
              <div
                className={`fixed z-50 w-80 rounded-2xl border border-white/[0.08] bg-[#0f1012]/95 backdrop-blur-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition-all duration-150 ease-out ${
                  flyoutVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
                style={{ top: flyoutPos.top, left: flyoutPos.left, transformOrigin: "left top" }}
              >
                <CreateProjectInline
                  darkMode={darkMode}
                  value={projectDraft}
                  setValue={setProjectDraft}
                  onSubmit={submitCreateProject}
                  onCancel={closeCreateProject}
                  miniIconBtn={miniIconBtn}
                  miniIconTheme={miniIconTheme}
                  textMuted={textMuted}
                  L={L}
                />
              </div>
            </>,
            document.body
          )
        : null}

      {!isLoggedIn ? (
        <div className={emptyBoxClass}>
          {L.signInToView}
        </div>
      ) : projectsWithLists.length > 0 ? (
        <div className="space-y-1">
          {projectsWithLists.map((f) => (
            <ProjectFolderBlock
  key={f.id}
  f={f}
  selected={
    selectedProjectId === f.id
  }
  onSelectProject={
    onSelectProject
  }
              isOpen={
                projectOpen[f.id] ?? true
              }
              dropOn={false}
              darkMode={darkMode}
              rowHover={rowHover}
              isLoggedIn={isLoggedIn}
              onAccountClick={onAccountClick}
              createChatInFolder={
                createChatInFolder
              }
              L={L}
              setProjectOpen={setProjectOpen}
              setDropProjectOver={
                setDropProjectOver
              }
              setDraggingId={setDraggingId}
              setDropOverId={setDropOverId}
              setDropSectionOver={
                setDropSectionOver
              }
              onMoveSessionToFolder={
                onMoveSessionToFolder
              }
              draggingId={draggingId}
              dropProjectOver={
                dropProjectOver
              }
              q={q}
              list={f.chats || []}
              emptyBox={emptyBoxClass}
              rootList={rootList}
              SessionRowComponent={({
                s,
                folderId,
              }) => (
                <SessionRow
                  s={s}
                  folderId={folderId}
                  active={false}
                  darkMode={darkMode}
                  rowActive={rowActive}
                  rowHover={rowHover}
                  onOpenSession={onOpenSession}
                  onRenameSession={onRenameSession}
                  onDeleteSession={onDeleteSession}
                  onCopySessionLink={
                    onCopySessionLink
                  }
                  copiedSid={copiedSid}
                  draggingId={draggingId}
                  dropOverId={null}
                  setDraggingId={setDraggingId}
                  setDropOverId={setDropOverId}
                  setDropSectionOver={
                    setDropSectionOver
                  }
                  setDropProjectOver={
                    setDropProjectOver
                  }
                  setMenu={setMenu}
                  menu={menu}
                  sessionMenuRef={
                    sessionMenuRef || {
                      current: null,
                    }
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
                  syncOrderKey={syncOrderKey}
                  onReorderFolderSessions={
                    onReorderFolderSessions
                  }
                />
              )}
            />
          ))}
        </div>
      ) : q ? (
        <div className={emptyBoxClass}>
          {L.noResults}
        </div>
      ) : null}
    </div>
  );
}