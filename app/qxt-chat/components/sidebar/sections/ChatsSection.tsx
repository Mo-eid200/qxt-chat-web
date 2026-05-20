import React from "react";
import { MessageSquare, MoreHorizontal, GripVertical, Check, Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import type { SessionItem } from "../types";
import { cn } from "../utils/cn";
import { safeTitle } from "../utils/safeTitle";
import { SectionHeader } from "../items/SectionHeader";

export type ChatsSectionProps = {
    collapsed?: boolean;
    isLoggedIn: boolean;
    L: Record<string, string>;
    rootList: SessionItem[];
    activeSessionId: string | null;
    onOpenSession?: (sid: string) => void;
    onDeleteSession?: (sid: string) => void;
    onRenameSession?: (sid: string) => void;
    onCopySessionLink?: (sid: string) => void;
    copiedSid: string | null;
    menu: { type: "session"; sid: string } | { type: "search" } | null;
    setMenu: (m: any) => void;
    sessionMenuRef: React.RefObject<HTMLDivElement | null>;
    q: string;
    rowActive: string;
    rowHover: string;
    darkMode: boolean;
    iconBtn: string;
    iconTheme: string;
    menuItem: string;
    // If you want to support these in the future just uncomment:
    // onNewChat?: () => void;
    // onNewChatInFolder?: (folderId: string | null) => void;
};

export function ChatsSection({
    isLoggedIn,
    L,
    rootList,
    activeSessionId,
    onOpenSession,
    onDeleteSession,
    onRenameSession,
    onCopySessionLink,
    copiedSid,
    menu,
    setMenu,
    sessionMenuRef,
    q,
    rowActive,
    rowHover,
    darkMode,
    iconBtn,
    iconTheme,
    menuItem,
}: ChatsSectionProps) {
    return (
        <section>
            <SectionHeader
                sectionKey="root"
                title={L.chats}
                IconOpen={MessageSquare}
                IconClosed={MessageSquare}
                isOpen={true}
                dropOn={false}
                workspaceBusy={false}
                L={L}
                setSectionsOpen={() => { }}
                setDropSectionOver={() => { }}
                setDraggingId={() => { }}
                setDropOverId={() => { }}
                setDropProjectOver={() => { }}
                darkMode={darkMode}
                rowBase=""
                rowHover={rowHover}
                sectionAccent={() => ""}
            />
            <div className="mt-1 pl-6 pr-1 space-y-1">
                {!isLoggedIn ? (
                    <div
                        className={cn(
                            "px-2 py-2 rounded-lg text-[12px]",
                            darkMode
                                ? "text-emerald-300/70 bg-black/20"
                                : "text-cyan-100/70 bg-black/10"
                        )}
                    >
                        {L.signInToView}
                    </div>
                ) : rootList.length === 0 ? (
                    <div
                        className={cn(
                            "px-2 py-2 rounded-lg text-[12px]",
                            darkMode
                                ? "text-emerald-300/70 bg-black/20"
                                : "text-cyan-100/70 bg-black/10"
                        )}
                    >
                        {q ? L.noResults : L.noSessions}
                    </div>
                ) : (
                    rootList.map((s) => (
                        <SessionRow
                            key={s.id}
                            s={s}
                            active={activeSessionId === s.id}
                            darkMode={darkMode}
                            rowActive={rowActive}
                            rowHover={rowHover}
                            onOpenSession={onOpenSession}
                            onRenameSession={onRenameSession}
                            onDeleteSession={onDeleteSession}
                            onCopySessionLink={onCopySessionLink}
                            copiedSid={copiedSid}
                            setMenu={setMenu}
                            menu={menu}
                            sessionMenuRef={sessionMenuRef}
                            iconBtn={iconBtn}
                            iconTheme={iconTheme}
                            menuItem={menuItem}
                            L={L}
                        />
                    ))
                )}
            </div>
        </section>
    );
}

type SessionRowProps = {
    s: SessionItem;
    active: boolean;
    darkMode: boolean;
    rowActive: string;
    rowHover: string;
    onOpenSession?: (sid: string) => void;
    onRenameSession?: (sid: string) => void;
    onDeleteSession?: (sid: string) => void;
    onCopySessionLink?: (sid: string) => void;
    copiedSid: string | null;
    setMenu: (m: any) => void;
    menu: { type: "session"; sid: string } | { type: "search" } | null;
    sessionMenuRef: React.RefObject<HTMLDivElement | null>;
    iconBtn: string;
    iconTheme: string;
    menuItem: string;
    L: Record<string, string>;
};

function SessionRow({
    s,
    active,
    darkMode,
    rowActive,
    rowHover,
    onOpenSession,
    onRenameSession,
    onDeleteSession,
    onCopySessionLink,
    copiedSid,
    setMenu,
    menu,
    sessionMenuRef,
    iconBtn,
    iconTheme,
    menuItem,
    L,
}: SessionRowProps) {
    const title = safeTitle(s,);
    return (
        <div
            className={cn(
                "group relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition",
                darkMode ? "text-emerald-200/90" : "text-cyan-100/90",
                active ? rowActive : rowHover
            )}
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
                <span className="text-[13px] leading-5 line-clamp-1">{title}</span>
            </button>
            <button
                type="button"
                onClick={() =>
                    setMenu(
                        menu?.type === "session" && menu.sid === s.id ? null : { type: "session", sid: s.id }
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