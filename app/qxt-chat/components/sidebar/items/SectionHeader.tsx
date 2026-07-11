import React from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../utils/cn";
import { SectionKey } from "../types";

type SectionHeaderProps = {
    sectionKey: SectionKey;
    title: string;
    IconOpen: React.ElementType;
    IconClosed: React.ElementType;
    showPlusWhenOpen?: boolean;
    onPlus?: () => void;
    onDropMoveTo?: (sid: string) => void;
    onOpen?: () => void;
    linkMode?: boolean;
    hideChevron?: boolean;
    clickable?: boolean;
    isOpen: boolean;
    dropOn: boolean;
    workspaceBusy: boolean;
    L: Record<string, string>;
    setSectionsOpen: (
        setter: (prev: Record<SectionKey, boolean>) => Record<SectionKey, boolean>
    ) => void;
    setDropSectionOver: (k: SectionKey | null) => void;
    setDraggingId: (id: string | null) => void;
    setDropOverId: (id: string | null) => void;
    setDropProjectOver: (id: string | null) => void;
    darkMode: boolean;
    rowBase: string;
    rowHover: string;
    sectionAccent: (k: SectionKey) => string;
};

export function SectionHeader({
    sectionKey,
    title,
    IconOpen,
    IconClosed,
    showPlusWhenOpen,
    onPlus,
    onDropMoveTo,
    onOpen,
    linkMode = false,
    hideChevron = false,
    clickable = true,
    isOpen,
    dropOn,
    workspaceBusy,
    L,
    setSectionsOpen,
    setDropSectionOver,
    setDraggingId,
    setDropOverId,
    setDropProjectOver,
    darkMode,
    rowBase,
    rowHover,
    sectionAccent,
}: SectionHeaderProps) {
    const FolderIcon = isOpen ? IconOpen : IconClosed;
    const showChevron = !hideChevron && !linkMode;
    const folderRow = cn(
        rowBase,
        sectionAccent(sectionKey),
        dropOn
            ? darkMode
                ? "ring-2 ring-emerald-400/10"
                : "ring-2 ring-cyan-300/15"
            : "",
        rowHover,
        darkMode ? "text-emerald-100/95" : "text-cyan-50",
        clickable ? "cursor-pointer" : "cursor-default"
    );

    return (
        <div
            className={folderRow}
            onClick={() => {
                if (onOpen) return onOpen();
                if (linkMode) return;
                setSectionsOpen((p: Record<SectionKey, boolean>) => ({
                    ...p,
                    [sectionKey]: !isOpen,
                }));
            }}
            onDragOver={e => {
                e.preventDefault();
                setDropSectionOver(sectionKey);
            }}
            onDragLeave={() =>
                setDropSectionOver(null)
            }
            onDrop={e => {
                e.preventDefault();
                const sid =
                    (() => {
                        try {
                            return e.dataTransfer.getData("text/plain");
                        } catch {
                            return "";
                        }
                    })();
                if (sid && onDropMoveTo) onDropMoveTo(sid);
                setDraggingId(null);
                setDropOverId(null);
                setDropSectionOver(null);
                setDropProjectOver(null);
            }}
            title={linkMode ? L.open : L.dropToMove}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : -1}
        >
            <FolderIcon className="w-4 h-4 opacity-90" />
            <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold leading-5 line-clamp-1">
                    {title}
                    {workspaceBusy && sectionKey === "projects" ? (
                        <span
                            className={cn(
                                "ml-2 text-[10px] font-medium opacity-70"
                            )}
                        >
                            {L.busy}
                        </span>
                    ) : null}
                </div>
            </div>
            {showPlusWhenOpen && isOpen && !linkMode && (
                <button
                    type="button"
                    className="h-6 w-6 rounded-md flex items-center justify-center transition active:scale-[0.98]"
                    onClick={e => {
                        e.stopPropagation();
                        onPlus?.();
                    }}
                    title={L.newProject}
                    aria-label={L.newProject}
                >
                    <Plus className="w-4 h-4" />
                </button>
            )}
            {showChevron && (
                <button
                    type="button"
                    className="h-6 w-6 rounded-md flex items-center justify-center transition active:scale-[0.98]"
                    onClick={e => {
                        e.stopPropagation();
                        setSectionsOpen((p: Record<SectionKey, boolean>) => ({
                            ...p,
                            [sectionKey]: !isOpen,
                        }));
                    }}
                    aria-label={isOpen ? L.collapse : L.expand}
                    title={isOpen ? L.collapse : L.expand}
                >
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </button>
            )}
        </div>
    );
}