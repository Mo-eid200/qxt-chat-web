"use client";

import React from "react";
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
  darkMode,
  renameDraft,
  setRenameDraftAction,
  closeRenameDialogAction,
  submitRenameDialogAction,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeRenameDialogAction();
      }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* dialog */}
      <div
        className={`
        relative w-full max-w-md rounded-2xl border p-4 shadow-[0_24px_80px_rgba(0,0,0,0.65)]
        ${darkMode
            ? "bg-[#061018]/95 border-emerald-900/60"
            : "bg-[#052536]/95 border-cyan-900/50"
          }
      `}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeRenameDialogAction();
          if (e.key === "Enter") submitRenameDialogAction();
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className={`text-sm font-semibold ${darkMode ? "text-emerald-50" : "text-cyan-50"
              }`}
          >
            Rename chat
          </div>

          <button
            type="button"
            onClick={closeRenameDialogAction}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${darkMode
                ? "text-emerald-100/80 hover:bg-white/5"
                : "text-cyan-50 hover:bg-white/5"
              }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`
          rounded-xl border px-2 py-2
          ${darkMode
              ? "bg-black/30 border-emerald-900/45"
              : "bg-black/15 border-cyan-900/45"
            }
        `}
        >
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraftAction(e.target.value)}
            placeholder="Type chat name..."
            className={`
            w-full bg-transparent outline-none text-[13px]
            ${darkMode
                ? "text-emerald-50 placeholder:text-emerald-100/40"
                : "text-cyan-50 placeholder:text-cyan-100/45"
              }
          `}
          />
        </div>

        <div className={`mt-3 flex gap-2 justify-end`}>
          <button
            type="button"
            onClick={closeRenameDialogAction}
            className={`
            h-9 px-3 rounded-xl text-[12px] border transition
            ${darkMode
                ? "border-emerald-900/60 bg-black/45 text-emerald-50"
                : "border-cyan-900/60 bg-black/20 text-cyan-50"
              }
          `}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submitRenameDialogAction}
            disabled={!renameDraft.trim()}
            className={`
            h-9 px-3 rounded-xl text-[12px] font-semibold transition active:scale-[0.98]
            ${darkMode
                ? "bg-emerald-500/15 hover:bg-emerald-500/22 border border-emerald-400/30 text-emerald-50 disabled:opacity-40"
                : "bg-cyan-500/15 hover:bg-cyan-500/22 border border-cyan-400/30 text-cyan-50 disabled:opacity-40"
              }
          `}
          >
            Save
          </button>
        </div>

        <div
          className={`mt-2 text-[11px] opacity-75 ${darkMode ? "text-emerald-300/70" : "text-cyan-200/80"
            }`}
        >
          Enter to save — Esc to close
        </div>
      </div>
    </div>
  );
}
