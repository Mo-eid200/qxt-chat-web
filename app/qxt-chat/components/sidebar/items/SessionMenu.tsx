import React from "react";
import { Pencil, Trash2, Check, Link as LinkIcon } from "lucide-react";
import { cn } from "../utils/cn";

type SessionMenuProps = {
    sId: string;
    copiedSid: string | null;
    onCopySessionLink?: (sid: string) => void;
    onRenameSession?: (sid: string) => void;
    onDeleteSession?: (sid: string) => void;
    setMenu: (m: any) => void;
    menuItem: string;
    L: Record<string, string>;
};

export function SessionMenu({ sId, copiedSid, onCopySessionLink, onRenameSession, onDeleteSession, setMenu, menuItem, L }: SessionMenuProps) {
    return (
        <>
            <button
                type="button"
                className={menuItem}
                onClick={() => {
                    onCopySessionLink?.(sId);
                    setMenu(null);
                }}
            >
                {copiedSid === sId ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                <span>{L.copyLink}</span>
            </button>
            <button
                type="button"
                className={menuItem}
                onClick={() => {
                    onRenameSession?.(sId);
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
                    onDeleteSession?.(sId);
                    setMenu(null);
                }}
            >
                <Trash2 className="w-4 h-4" />
                <span>{L.delete}</span>
            </button>
        </>
    );
}