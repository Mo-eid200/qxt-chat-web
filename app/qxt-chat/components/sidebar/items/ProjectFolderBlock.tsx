import React from "react";
import { Folder, FolderOpen, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../utils/cn";
import type { ProjectFolder, SessionItem } from "../types";

// جزء توليد كلاس البادج على حسب نوع المشروع/المجلد
function folderBadge(kind?: string, darkMode?: boolean): string {
    const k = kind || "project";
    if (darkMode) {
        if (k === "project") return "bg-cyan-500/10 text-cyan-100 border border-cyan-400/20";
        if (k === "library") return "bg-violet-500/10 text-violet-100 border border-violet-400/20";
        if (k === "code") return "bg-amber-500/10 text-amber-100 border border-amber-400/20";
        return "bg-emerald-500/10 text-emerald-100 border border-emerald-400/20";
    } else {
        if (k === "project") return "bg-cyan-500/15 text-cyan-50 border border-cyan-400/25";
        if (k === "library") return "bg-violet-500/15 text-violet-50 border border-violet-400/25";
        if (k === "code") return "bg-amber-500/15 text-amber-50 border border-amber-400/25";
        return "bg-emerald-500/15 text-emerald-50 border border-emerald-400/25";
    }
}

type ProjectFolderBlockProps = {
    f: ProjectFolder;
    isOpen: boolean;
    dropOn: boolean;
    darkMode: boolean;
    rowHover: string;
    isLoggedIn: boolean;
    onAccountClick?: () => void;
    createChatInFolder: (id: string | null) => void;
    L: Record<string, string>;
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
    q: string;
    list: SessionItem[];
    emptyBox: string;
    rootList: SessionItem[];
    SessionRowComponent: React.ComponentType<{ s: SessionItem; folderId: string | null }>;
};

export function ProjectFolderBlock({
    f,
    isOpen,
    dropOn,
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
    rootList,
    SessionRowComponent,
}: ProjectFolderBlockProps) {
    const headerRow = cn(
        "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition text-left",
        dropOn
            ? darkMode
                ? "bg-emerald-500/10 ring-2 ring-emerald-300/10"
                : "bg-cyan-500/10 ring-2 ring-cyan-300/15"
            : "",
        rowHover,
        darkMode ? "text-emerald-100/95" : "text-cyan-50"
    );
    const innerWrap = cn("mt-1 pl-6 pr-1 space-y-1");

    return (
        <div className="mb-1">
            <div
                className={headerRow}
                onClick={() => setProjectOpen((p) => ({ ...p, [f.id]: !isOpen }))}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    setDropProjectOver(f.id);
                }}
                onDragLeave={() => setDropProjectOver(null)}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    const sid =
                        draggingId ||
                        (() => {
                            try {
                                return e.dataTransfer.getData("text/plain");
                            } catch {
                                return "";
                            }
                        })();
                    if (sid) onMoveSessionToFolder?.(sid, f.id);
                    setDraggingId(null);
                    setDropOverId(null);
                    setDropSectionOver(null);
                    setDropProjectOver(null);
                }}
                title={L.dropToMove}
            >
                {isOpen ? <FolderOpen className="w-4 h-4 opacity-90" /> : <Folder className="w-4 h-4 opacity-90" />}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[13px] font-semibold leading-5 line-clamp-1">{f.title}</div>
                        <span className={cn("shrink-0 text-[10px] px-2 py-0.5 rounded-full", folderBadge(f.kind, darkMode))}>
                            {(f.kind || "project").toUpperCase()}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    className="h-6 w-6 rounded-md flex items-center justify-center transition active:scale-[0.98]"
                    onClick={e => {
                        e.stopPropagation();
                        if (!isLoggedIn) return onAccountClick?.();
                        createChatInFolder(f.id);
                    }}
                    title={L.newChatInProject}
                    aria-label={L.newChatInProject}
                >
                    <Plus className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    className="h-6 w-6 rounded-md flex items-center justify-center transition active:scale-[0.98]"
                    onClick={e => {
                        e.stopPropagation();
                        setProjectOpen((p) => ({ ...p, [f.id]: !isOpen }));
                    }}
                    aria-label={isOpen ? L.collapse : L.expand}
                    title={isOpen ? L.collapse : L.expand}
                >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
            {isOpen && (
                <div className={innerWrap}>
                    {!isLoggedIn ? (
                        <div className={emptyBox}>{L.signInToView}</div>
                    ) : list.length === 0 ? (
                        <div className={emptyBox}>{q ? L.noResults : L.noSessions}</div>
                    ) : (
                        list.map((s) => <SessionRowComponent key={s.id} s={s} folderId={f.id} />)
                    )}
                </div>
            )}
        </div>
    );
}