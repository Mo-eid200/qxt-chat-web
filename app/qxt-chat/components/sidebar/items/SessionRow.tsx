import React from "react";
import {
    MessageSquare,
    MoreHorizontal,
    GripVertical,
    Check,
    Pencil,
    Trash2,
    Link as LinkIcon,
} from "lucide-react";
import { cn } from "../utils/cn";
import { safeTitle } from "../utils/safeTitle";
import { SessionItem } from "../types";

type ProjectsWithLists = { id: string; chats: SessionItem[] }[];

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
    setDraggingId: (id: string | null) => void;
    setDropOverId: (id: string | null) => void;
    setDropSectionOver: (v: unknown) => void;
    setDropProjectOver: (v: unknown) => void;
    setMenu: (m: unknown) => void;
    menu: { type: "session"; sid: string } | { type: "search" } | null;
    sessionMenuRef: React.RefObject<HTMLDivElement>;
    iconBtn: string;
    iconTheme: string;
    miniIconBtn: string;
    miniIconTheme: string;
    menuItem: string;
    L: Record<string, string>;
    q: string;
    orderMap: Record<string, string[]>;
    rootList: SessionItem[];
    projectsWithLists: ProjectsWithLists;
    syncOrderKey: (folderId: string | null, ids: string[]) => void;
    onReorderFolderSessions?: (folderId: string | null, ids: string[]) => void;
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
    miniIconBtn,
    miniIconTheme,
    menuItem,
    L,
    q,
    orderMap,
    rootList,
    projectsWithLists,
    syncOrderKey,
    onReorderFolderSessions,
}: SessionRowProps) {
    const title = safeTitle(s,);
    const isDragging = draggingId === s.id;
    const isDropOver = dropOverId === s.id && draggingId && draggingId !== s.id;

    return (
        <div
            className={cn(
                "group relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition",
                darkMode ? "text-emerald-200/90" : "text-cyan-100/90",
                active ? rowActive : rowHover,
                isDragging && "opacity-60",
                isDropOver &&
                (darkMode ? "ring-2 ring-emerald-400/20" : "ring-2 ring-cyan-300/20")
            )}
            draggable
            onDragStart={(
                e: React.DragEvent<HTMLDivElement>
            ) => {
                setDraggingId(s.id);
                try {
                    e.dataTransfer.setData("text/plain", s.id);
                } catch { }
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
                if (draggingId && draggingId !== s.id)
                    setDropOverId(s.id);
            }}
            onDrop={(
                e: React.DragEvent<HTMLDivElement>
            ) => {
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

                if (!sid || sid === s.id) return;

                const key = folderId ?? "__root__";
                const baseIds =
                    folderId === null
                        ? rootList.map((x) => x.id)
                        : (
                            projectsWithLists.find(
                                (f) => f.id === folderId
                            )?.chats ?? []
                        ).map((x) => x.id);

                // إذا عندك منطق order هنا ضع الكود المطلوب
                // ...

                setDraggingId(null);
                setDropOverId(null);
            }}
        >
            <div
                className="hidden group-hover:flex items-center justify-center opacity-70 hover:opacity-100 cursor-grab active:cursor-grabbing"
                title={L.drag}
            >
                <GripVertical className="w-4 h-4" />
            </div>
            <button
                className="flex-1 flex items-center gap-2 min-w-0"
                onClick={() => onOpenSession?.(s.id)}
                type="button"
                title={title}
            >
                <MessageSquare className="w-4 h-4 opacity-80 shrink-0" />
                <span className="text-[13px] leading-5 line-clamp-1">
                    {title}
                </span>
            </button>
            <button
                type="button"
                onClick={() =>
                    setMenu(
                        menu?.type === "session" && menu.sid === s.id
                            ? null
                            : { type: "session", sid: s.id }
                    )
                }
                className={cn(
                    "opacity-0 group-hover:opacity-100 transition",
                    iconBtn,
                    iconTheme,
                    "h-7 w-7"
                )}
                aria-label={L.options}
                title={L.options}
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {menu?.type === "session" && menu.sid === s.id && (
                <div
                    ref={sessionMenuRef}
                    className={cn(
                        "absolute top-[38px]",
                        "right-2",
                        "w-[220px] rounded-2xl border shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
                        "bg-white dark:bg-gray-900",
                        "p-2 z-[9999]"
                    )}
                >
                    <button
                        type="button"
                        className={menuItem}
                        onClick={() => {
                            onCopySessionLink?.(s.id);
                            setMenu(null);
                        }}
                    >
                        {copiedSid === s.id ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <LinkIcon className="w-4 h-4" />
                        )}
                        <span>{L.copyLink}</span>
                    </button>
                    <button
                        type="button"
                        className={menuItem}
                        onClick={() => {
                            onRenameSession?.(s.id);
                            setMenu(null);
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                        <span>{L.rename}</span>
                    </button>
                    <div className="my-2 h-px bg-white/10" />
                    <button
                        type="button"
                        className={cn(menuItem, "text-red-200 hover:bg-red-500/10")}
                        onClick={() => {
                            onDeleteSession?.(s.id);
                            setMenu(null);
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>{L.delete}</span>
                    </button>
                </div>
            )}
        </div>
    );
}