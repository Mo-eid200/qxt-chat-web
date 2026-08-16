"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Pencil,
  X,
} from "lucide-react";

type Props = {
  open: boolean;
  darkMode: boolean;

  renameDraft: string;
  renameBusy?: boolean;

  setRenameDraftAction: (v: string) => void;
  closeRenameDialogAction: () => void;
  submitRenameDialogAction: () => void;
};

export default function RenameDialog({
  open,
  darkMode,
  renameDraft,
  renameBusy = false,
  setRenameDraftAction,
  closeRenameDialogAction,
  submitRenameDialogAction,
}: Props) {
  const [visible, setVisible] =
    useState(false);

  const inputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setVisible(true);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    });

    return () =>
      cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (
      e: KeyboardEvent
    ) => {
      if (
        e.key === "Escape" &&
        !renameBusy
      ) {
        closeRenameDialogAction();
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
  }, [
    open,
    renameBusy,
    closeRenameDialogAction,
  ]);

  if (!open) return null;

  const canSubmit =
    !!renameDraft.trim() && !renameBusy;

  return (
    <div
      className="
        fixed inset-0 z-[10000]
        flex items-center justify-center
        px-4
      "
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !renameBusy
        ) {
          closeRenameDialogAction();
        }
      }}
    >
      {/* Backdrop */}

      <div
        className={`
          pointer-events-none
          absolute inset-0
          bg-black/65
          backdrop-blur-sm
          transition-opacity duration-150

          ${
            visible
              ? "opacity-100"
              : "opacity-0"
          }
        `}
      />

      {/* Dialog */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-chat-title"
        className={`
          relative
          w-full max-w-[420px]
          overflow-hidden
          rounded-2xl border
          shadow-[0_24px_80px_rgba(0,0,0,0.55)]
          transition-all
          duration-150 ease-out

          ${
            darkMode
              ? `
                border-white/[0.08]
                bg-[#111214]/98
                text-white
              `
              : `
                border-black/[0.08]
                bg-white
                text-slate-900
              `
          }

          ${
            visible
              ? "scale-100 opacity-100"
              : "scale-[0.97] opacity-0"
          }
        `}
      >
        {/* Content */}

        <div className="p-5">
          <button
            type="button"
            disabled={renameBusy}
            onClick={
              closeRenameDialogAction
            }
            className={`
              absolute right-4 top-4

              flex h-7 w-7
              items-center justify-center

              rounded-lg

              transition-colors

              disabled:pointer-events-none
              disabled:opacity-40

              ${
                darkMode
                  ? `
                    text-white/40
                    hover:bg-white/[0.06]
                    hover:text-white/80
                  `
                  : `
                    text-slate-400
                    hover:bg-black/[0.05]
                    hover:text-slate-700
                  `
              }
            `}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon */}

          <div
            className="
              mb-4
              flex h-10 w-10
              items-center justify-center

              rounded-xl

              bg-amber-300/[0.10]
              text-amber-300
            "
          >
            <Pencil className="h-5 w-5" />
          </div>

          <h2
            id="rename-chat-title"
            className="
              text-[17px]
              font-semibold
              tracking-[-0.01em]
            "
          >
            Rename chat
          </h2>

          <p
            className={`
              mt-1.5
              text-[13px]
              leading-5

              ${
                darkMode
                  ? "text-white/45"
                  : "text-slate-500"
              }
            `}
          >
            Choose a clear name for this
            conversation.
          </p>

          {/* Input */}

          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();

              if (canSubmit) {
                submitRenameDialogAction();
              }
            }}
          >
            <div
              className={`
                rounded-xl border
                px-3 py-2.5

                transition-all
                focus-within:ring-2

                ${
                  darkMode
                    ? `
                      border-white/[0.08]
                      bg-white/[0.035]

                      focus-within:border-amber-300/30
                      focus-within:ring-amber-300/[0.08]
                    `
                    : `
                      border-black/[0.08]
                      bg-black/[0.025]

                      focus-within:border-amber-500/30
                      focus-within:ring-amber-500/[0.08]
                    `
                }
              `}
            >
              <input
                ref={inputRef}
                value={renameDraft}
                disabled={renameBusy}
                maxLength={120}
                onChange={(e) =>
                  setRenameDraftAction(
                    e.target.value
                  )
                }
                placeholder="Chat name"
                className={`
                  w-full
                  bg-transparent
                  text-[13px]
                  outline-none
                  focus:outline-none
                  focus:ring-0
                  focus-visible:outline-none
                  focus-visible:ring-0

                  disabled:opacity-60

                  ${
                    darkMode
                      ? `
                        text-white/90
                        placeholder:text-white/25
                      `
                      : `
                        text-slate-900
                        placeholder:text-slate-400
                      `
                  }
                `}
              />
            </div>

            <div
              className={`
                mt-2 flex
                items-center
                justify-between
                text-[11px]

                ${
                  darkMode
                    ? "text-white/30"
                    : "text-slate-400"
                }
              `}
            >
              <span>
                Enter to save · Esc to close
              </span>

              <span>
                {renameDraft.length}/120
              </span>
            </div>

            {/* Actions */}

            <div
              className="
                mt-5
                flex justify-end
                gap-2
              "
            >
              <button
                type="button"
                disabled={renameBusy}
                onClick={
                  closeRenameDialogAction
                }
                className={`
                  rounded-xl
                  px-4 py-2

                  text-[13px]
                  font-medium

                  transition-colors

                  disabled:pointer-events-none
                  disabled:opacity-40

                  ${
                    darkMode
                      ? `
                        bg-white/[0.05]
                        text-white/65

                        hover:bg-white/[0.08]
                        hover:text-white/90
                      `
                      : `
                        bg-black/[0.04]
                        text-slate-600

                        hover:bg-black/[0.07]
                      `
                  }
                `}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="
                  min-w-[92px]

                  rounded-xl

                  bg-amber-300
                  px-4 py-2

                  text-[13px]
                  font-semibold
                  text-black

                  transition-all

                  hover:bg-amber-200

                  active:scale-[0.98]

                  disabled:pointer-events-none
                  disabled:opacity-40
                "
              >
                {renameBusy
                  ? "Saving..."
                  : "Rename"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}