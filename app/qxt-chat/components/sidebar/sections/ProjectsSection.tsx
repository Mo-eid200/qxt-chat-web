import React from "react";
import { Folder, FolderOpen, Plus } from "lucide-react";
import { ProjectFolder } from "../types";
import { cn } from "../utils/cn";
import { SectionHeader } from "../items/SectionHeader";
import { ProjectFolderBlock } from "../items/ProjectFolderBlock";

type ProjectsSectionProps = {
    collapsed?: boolean;
    isLoggedIn: boolean;
    L: Record<string, string>;
    projectsWithLists: ProjectFolder[];
    projectOpen: Record<string, boolean>;
    onCreateProjectFolder?: (title: string) => void;
    openCreateProject?: () => void;
    creatingProject: boolean;
    projectDraft: string;
    setProjectDraft: (val: string) => void;
    submitCreateProject: () => void;
    closeCreateProject: () => void;
    rowHover: string;
    darkMode: boolean;
    miniIconBtn: string;
    miniIconTheme: string;
    q: string;
    textMuted: string;
    sectionProps: Omit<Parameters<typeof SectionHeader>[0], "title" | "sectionKey" | "IconOpen" | "IconClosed">;
    // + باقي props اللازمة لتمريرها لكل ProjectFolderBlock (مثل drag & drop / callback ... إلخ)
    rootList: any[]; // لو تحتاج استدعاء root list sessions
    onAccountClick?: () => void;
    createChatInFolder: (id: string | null) => void;
    setProjectOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setDropProjectOver: (id: string | null) => void;
    setDraggingId: (id: string | null) => void;
    setDropOverId: (id: string | null) => void;
    setDropSectionOver: (
        v: string | null
    ) => void;
    onMoveSessionToFolder?: (sid: string, folderId: string | null) => void;
    draggingId: string | null;
    dropProjectOver: string | null;
    createChatInProject: (folderId: string | null) => void;
};

export function ProjectsSection({
    isLoggedIn,
    L,
    projectsWithLists,
    projectOpen,
    openCreateProject,
    creatingProject,
    projectDraft,
    setProjectDraft,
    submitCreateProject,
    closeCreateProject,
    rowHover,
    darkMode,
    miniIconBtn,
    miniIconTheme,
    q,
    textMuted,
    sectionProps,
    rootList,
    onAccountClick,
    createChatInFolder,
    setProjectOpen,
    setDropProjectOver,
    setDraggingId,
    setDropOverId,
    setDropSectionOver,
    onMoveSessionToFolder,
    draggingId,
    dropProjectOver,
    createChatInProject,
}: ProjectsSectionProps) {
    return (
        <section>
            <SectionHeader
                sectionKey="projects"
                title={L.projects}
                IconOpen={FolderOpen}
                IconClosed={Folder}
                showPlusWhenOpen
                onPlus={openCreateProject}
                {...sectionProps}
            />
            {creatingProject && (
                <div className="mt-2 px-2">
                    <div
                        className={cn(
                            "rounded-2xl border p-2 backdrop-blur-xl",
                            darkMode ? "bg-black/35 border-emerald-900/55" : "bg-black/15 border-cyan-900/45"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 opacity-85" />
                            <input
                                autoFocus
                                value={projectDraft}
                                onChange={(e) => setProjectDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") submitCreateProject();
                                    if (e.key === "Escape") closeCreateProject();
                                }}
                                placeholder={L.projectNamePlaceholder}
                                className={cn(
                                    "w-full bg-transparent outline-none text-[12px] px-2 py-2 rounded-xl",
                                    darkMode
                                        ? "text-emerald-50 placeholder:text-emerald-100/40"
                                        : "text-cyan-50 placeholder:text-cyan-100/45"
                                )}
                            />
                            <button
                                type="button"
                                className={cn(
                                    "h-9 px-3 rounded-xl text-[12px] font-semibold transition active:scale-[0.98]",
                                    darkMode
                                        ? "bg-emerald-500/15 hover:bg-emerald-500/22 border border-emerald-400/30 text-emerald-50"
                                        : "bg-cyan-500/15 hover:bg-cyan-500/22 border border-cyan-400/30 text-cyan-50"
                                )}
                                onClick={submitCreateProject}
                                disabled={!projectDraft.trim()}
                                title={L.create}
                            >
                                {L.create}
                            </button>
                            <button
                                type="button"
                                className={cn(miniIconBtn, miniIconTheme, "h-9 w-9")}
                                onClick={closeCreateProject}
                                title={L.cancel}
                            >
                                ×
                            </button>
                        </div>
                        <div className={cn("mt-2 text-[11px] opacity-75", textMuted)}>{L.createHint}</div>
                    </div>
                </div>
            )}
            <div className="mt-1 pl-2 pr-1 space-y-1">
                {!isLoggedIn ? (
                    <div className={cn("px-2 py-2 rounded-lg text-[12px]", darkMode ? "text-emerald-300/70 bg-black/20" : "text-cyan-100/70 bg-black/10")}>
                        {L.signInToView}
                    </div>
                ) : projectsWithLists.length === 0 ? (
                    <div className={cn("px-2 py-2 rounded-lg text-[12px]", darkMode ? "text-emerald-300/70 bg-black/20" : "text-cyan-100/70 bg-black/10")}>
                        {q ? L.noResults : L.noProjects}
                    </div>
                ) : (
                    projectsWithLists.map((f) => (
                        <ProjectFolderBlock
                            key={f.id}
                            f={f}
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
                            emptyBox={""}
                            rootList={rootList}
                            SessionRowComponent={() => null}
                        />
                    ))
                )}
            </div>
        </section>
    );
}