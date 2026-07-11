"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  darkMode: boolean;
  renameDraft: string;
  setRenameDraftAction: (v: string) => void;
  closeRenameDialogAction: () => void;
  submitRenameDialogAction: () => void;
};

export default function RenameDialog({
  open,
  renameDraft,
  setRenameDraftAction,
  closeRenameDialogAction,
  submitRenameDialogAction,
}: Props) {
  // Same enter/exit motion pattern used everywhere else in the
  // sidebar (Create project flyout, session menu, profile menu):
  // mount immediately but start at opacity-0/scale-95, then flip to
  // visible on the next frame so the transition actually animates.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeRenameDialogAction();
      }}
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative w-full max-w-md rounded-2xl border border-amber-300/20 bg-[#0f1012]/95 backdrop-blur-2xl p-4 shadow-[0_24px_80px_rgba(0,0,0,0.65)] transition-all duration-150 ease-out ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeRenameDialogAction();
          if (e.key === "Enter") submitRenameDialogAction();
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-white">
            Rename chat
          </div>
          <button
            type="button"
            onClick={closeRenameDialogAction}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/[0.06] hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl border border-amber-300/[0.18] bg-black/30 px-2 py-2">
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraftAction(e.target.value)}
            placeholder="Type chat name..."
            className="w-full bg-transparent outline-none text-[13px] text-white placeholder:text-white/35"
          />
        </div>

        <div className="mt-3 flex gap-2 justify-end">
          <button
            type="button"
            onClick={closeRenameDialogAction}
            className="h-9 px-3 rounded-xl text-[12px] border border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitRenameDialogAction}
            disabled={!renameDraft.trim()}
            className="h-9 px-3 rounded-xl text-[12px] font-semibold bg-amber-300 text-black hover:bg-amber-200 transition active:scale-[0.98] disabled:opacity-40"
          >
            Save
          </button>
        </div>

        <div className="mt-2 text-[11px] text-white/40">
          Enter to save — Esc to close
        </div>
      </div>
    </div>
  );
}
