import React from "react";

import type {
  ProjectFolder,
  SessionItem,
} from "../types";
import { cn } from "../utils/cn";
import { ProjectFolderBlock } from "../items/ProjectFolderBlock";
import { SessionRow } from "../items/SessionRow";
import { CreateProjectFlyout } from "./CreateProjectFlyout";

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
  activeSessionId?: string | null;
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
  dropOverId: string | null;
  copiedSid?: string | null;
  menu?: SessionMenuState;
  setMenu?: (m: SessionMenuState) => void;
  sessionMenuRef?: React.RefObject<HTMLDivElement | null>;
  onOpenSession?: (sid: string) => void;
  onDeleteSession?: (sid: string) => void;
  onRenameSession?: (sid: string) => void;
  onCopySessionLink?: (sid: string) => void;
  onTogglePin?: (sid: string) => void;
  onToggleStar?: (sid: string) => void;
  onToggleUnread?: (sid: string) => void;
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
  createAnchorRef?: React.RefObject<HTMLDivElement | null>;
};

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
  activeSessionId = null,
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
  onTogglePin,
  onToggleStar,
  onToggleUnread,
  orderMap = {},
  syncOrderKey = () => {},
  onReorderFolderSessions,
  selectedProjectId = null,
  onSelectProject = () => {},
  createAnchorRef,
}: ProjectsSectionProps) {
  const emptyBoxClass = cn(
    "rounded-2xl border px-3 py-3 text-[12px] leading-5",
    darkMode
      ? "border-white/[0.06] bg-white/[0.03] text-white/60"
      : "border-black/[0.06] bg-black/[0.03] text-slate-500"
  );

  return (
    <div className="relative space-y-2">
      {createAnchorRef ? (
        <CreateProjectFlyout
          open={creatingProject}
          anchorRef={createAnchorRef}
          darkMode={darkMode}
          value={projectDraft}
          setValue={setProjectDraft}
          onSubmit={submitCreateProject}
          onCancel={closeCreateProject}
          L={L}
        />
      ) : null}

      {!isLoggedIn ? (
        <div className={emptyBoxClass}>
          {L.signInToView}
        </div>
      ) : projectsWithLists.length > 0 ? (
        <div className="space-y-2">
          {projectsWithLists.map((f) => (
            <ProjectFolderBlock
              key={f.id}
              f={f}
              selected={selectedProjectId === f.id}
              onSelectProject={onSelectProject}
              isOpen={projectOpen[f.id] ?? true}
              dropOn={false}
              darkMode={darkMode}
              rowHover={rowHover}
              isLoggedIn={isLoggedIn}
              onAccountClick={onAccountClick}
              createChatInFolder={createChatInFolder}
              L={L}
              setProjectOpen={setProjectOpen}
              setDropProjectOver={setDropProjectOver}
              setDraggingId={setDraggingId}
              setDropOverId={setDropOverId}
              setDropSectionOver={setDropSectionOver}
              onMoveSessionToFolder={onMoveSessionToFolder}
              draggingId={draggingId}
              dropProjectOver={dropProjectOver}
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
                  active={s.id === activeSessionId}
                  darkMode={darkMode}
                  rowActive={rowActive}
                  rowHover={rowHover}
                  onOpenSession={onOpenSession}
                  onRenameSession={onRenameSession}
                  onDeleteSession={onDeleteSession}
                  onCopySessionLink={onCopySessionLink}
                  onTogglePin={onTogglePin}
                  onToggleStar={onToggleStar}
                  onToggleUnread={onToggleUnread}
                  copiedSid={copiedSid}
                  draggingId={draggingId}
                  dropOverId={null}
                  setDraggingId={setDraggingId}
                  setDropOverId={setDropOverId}
                  setDropSectionOver={setDropSectionOver}
                  setDropProjectOver={setDropProjectOver}
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
                  projectsWithLists={projectsWithLists}
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
      ) : (
        <div className={emptyBoxClass}>
          {L.noProjectsYet || "No projects yet."}
        </div>
      )}
    </div>
  );
}