"use client";

import React, { useEffect } from "react";
import {
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  busy?: boolean;
  darkMode?: boolean;
  onCloseAction: () => void;
  onConfirmAction: () => void;
};

export default function DeleteSessionDialog({
  open,
  title,
  busy = false,
  darkMode = true,
  onCloseAction,
  onConfirmAction,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (
      e: KeyboardEvent
    ) => {
      if (e.key === "Escape" && !busy) {
        onCloseAction();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, busy, onCloseAction]);

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-[10000]
        flex items-center justify-center
        bg-black/60
        px-4
        backdrop-blur-sm
      "
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !busy
        ) {
          onCloseAction();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-session-title"
        className={`
          relative w-full max-w-[420px]
          overflow-hidden rounded-2xl
          border
          shadow-[0_24px_80px_rgba(0,0,0,0.55)]
          ${
            darkMode
              ? "border-white/[0.08] bg-[#111214] text-white"
              : "border-black/[0.08] bg-white text-slate-900"
          }
        `}
      >
        <div className="p-5">
          <button
            type="button"
            disabled={busy}
            onClick={onCloseAction}
            className={`
              absolute right-4 top-4
              flex h-7 w-7 items-center justify-center
              rounded-lg transition-colors
              disabled:pointer-events-none
              disabled:opacity-40
              ${
                darkMode
                  ? "text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                  : "text-slate-400 hover:bg-black/[0.05] hover:text-slate-700"
              }
            `}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div
            className="
              mb-4 flex h-10 w-10
              items-center justify-center
              rounded-xl
              bg-red-500/[0.10]
              text-red-400
            "
          >
            <AlertTriangle className="h-5 w-5" />
          </div>

          <h2
            id="delete-session-title"
            className="text-[17px] font-semibold"
          >
            Delete chat?
          </h2>

          <p
            className={`
              mt-2 text-[13px] leading-5
              ${
                darkMode
                  ? "text-white/50"
                  : "text-slate-500"
              }
            `}
          >
            This will permanently delete
          </p>

          <div
            className={`
              mt-3 truncate rounded-xl border
              px-3 py-2.5 text-[13px] font-medium
              ${
                darkMode
                  ? "border-white/[0.06] bg-white/[0.03] text-white/80"
                  : "border-black/[0.06] bg-black/[0.025] text-slate-800"
              }
            `}
            title={title}
          >
            {title || "Untitled chat"}
          </div>

          <p
            className={`
              mt-3 text-[12px]
              ${
                darkMode
                  ? "text-white/35"
                  : "text-slate-400"
              }
            `}
          >
            This action cannot be undone.
          </p>
        </div>

        <div
          className={`
            flex justify-end gap-2
            border-t px-5 py-4
            ${
              darkMode
                ? "border-white/[0.06]"
                : "border-black/[0.06]"
            }
          `}
        >
          <button
            type="button"
            disabled={busy}
            onClick={onCloseAction}
            className={`
              rounded-xl px-4 py-2
              text-[13px] font-medium
              transition-colors
              disabled:opacity-40
              ${
                darkMode
                  ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.08]"
                  : "bg-black/[0.04] text-slate-600 hover:bg-black/[0.07]"
              }
            `}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirmAction}
            className="
              flex min-w-[92px]
              items-center justify-center gap-2
              rounded-xl
              bg-red-500/90
              px-4 py-2
              text-[13px] font-semibold
              text-white
              transition-all
              hover:bg-red-500
              active:scale-[0.98]
              disabled:pointer-events-none
              disabled:opacity-60
            "
          >
            <Trash2 className="h-3.5 w-3.5" />

            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}