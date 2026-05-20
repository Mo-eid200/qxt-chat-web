"use client";

import React from "react";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Flag,
  Pencil,
  Share2,
} from "lucide-react";

type Role = "user" | "assistant" | "system";

interface MessageActionsProps {
  role: Role;
  content: string;
  messageId: string;
  darkMode: boolean;
  lang: "en" | "ar";
  canEdit?: boolean;
  reaction?: "up" | "down" | null;

  // ✅ Action callbacks (logic moved to parent)
  onCopyAction?: () => void;
  onSpeakAction?: () => void;
  onEditAction?: () => void;
  onReportAction?: () => void;
  onReactionAction?: (r: "up" | "down" | null) => void;
  onShareAction?: () => void;

  // UI state passed from parent
  isCopied?: boolean;
  isSpeaking?: boolean;
}

export function MessageActions({
  role,
  content,
  messageId,
  darkMode,
  lang,
  canEdit,
  reaction,
  onCopyAction,
  onSpeakAction,
  onEditAction,
  onReportAction,
  onReactionAction,
  onShareAction,
  isCopied,
  isSpeaking,
}: MessageActionsProps) {
  const isAr = lang === "ar";

  // ========================
  // COMPUTED VALUES
  // ========================

  // ✅ FIX 3: Protect empty content
  const hasContent = !!content?.trim();

  // ✅ FIX 1: Remove useMemo - not necessary
  const hasHandlers = {
    copy: !!onCopyAction,
    speak: !!onSpeakAction,
    share: !!onShareAction,
    edit: !!onEditAction,
    report: !!onReportAction,
    reaction: !!onReactionAction,
  };

  // ========================
  // STYLES
  // ========================

  // ✅ BONUS: Added hover:scale-105 for smooth hover
  const btnBase =
    "h-7 w-7 rounded-md flex items-center justify-center transition-all duration-200 border text-[10px] font-medium hover:scale-105";

  const theme = darkMode
    ? "bg-black/35 border-emerald-900/70 text-emerald-100 hover:bg-black/55 active:scale-95"
    : "bg-black/25 border-cyan-900/50 text-cyan-50 hover:bg-black/40 active:scale-95";

  const muted = darkMode ? "text-emerald-300/70" : "text-cyan-200/70";

  // ========================
  // DISABLED STATE
  // ========================

  const disabledBtn = "opacity-40 cursor-not-allowed pointer-events-none hover:scale-100";

  // Skip system messages
  if (role === "system") return null;

  return (
    <div
      role="group"
      aria-label={isAr ? "إجراءات الرسالة" : "Message actions"}
      className={`mt-2 flex items-center gap-1.5 ${muted}`}
    >
      {/* ======================== */}
      {/* Copy Button */}
      {/* ======================== */}
      <button
        type="button"
        onClick={() => {
          if (!hasContent || !hasHandlers.copy) return;
          onCopyAction?.();
        }}
        disabled={!hasContent || !hasHandlers.copy}
        className={`${btnBase} ${theme} ${!hasContent || !hasHandlers.copy ? disabledBtn : ""
          }`}
        title={isAr ? "نسخ" : "Copy"}
        aria-label={isAr ? "نسخ النص" : "Copy message"}
        aria-disabled={!hasContent || !hasHandlers.copy}
      >
        <div
          className={`transition-all duration-300 ${isCopied ? "text-green-400 scale-110" : ""
            }`}
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* ======================== */}
      {/* Like / Dislike (Assistant only) */}
      {/* ======================== */}
      {role === "assistant" && (
        <>
          {/* Like Button */}
          <button
            type="button"
            onClick={() => {
              if (!hasHandlers.reaction) return;
              onReactionAction?.(reaction === "up" ? null : "up");
            }}
            disabled={!hasHandlers.reaction}
            className={`${btnBase} ${theme} ${reaction === "up"
              ? "bg-green-500/30 border-green-600/70 shadow-lg shadow-green-500/20"
              : ""
              } ${!hasHandlers.reaction ? disabledBtn : ""}`}
            title={isAr ? "إعجاب" : "Like"}
            aria-label={isAr ? "إعجاب بالرد" : "Like this response"}
            aria-pressed={reaction === "up"}
            aria-disabled={!hasHandlers.reaction}
          >
            <ThumbsUp
              className={`w-3.5 h-3.5 transition-transform duration-300 ${reaction === "up" ? "fill-current scale-110" : ""
                }`}
            />
          </button>

          {/* Dislike Button */}
          <button
            type="button"
            onClick={() => {
              if (!hasHandlers.reaction) return;
              onReactionAction?.(reaction === "down" ? null : "down");
            }}
            disabled={!hasHandlers.reaction}
            className={`${btnBase} ${theme} ${reaction === "down"
              ? "bg-red-500/30 border-red-600/70 shadow-lg shadow-red-500/20"
              : ""
              } ${!hasHandlers.reaction ? disabledBtn : ""}`}
            title={isAr ? "عدم إعجاب" : "Dislike"}
            aria-label={isAr ? "عدم الإعجاب بالرد" : "Dislike this response"}
            aria-pressed={reaction === "down"}
            aria-disabled={!hasHandlers.reaction}
          >
            <ThumbsDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${reaction === "down" ? "fill-current scale-110" : ""
                }`}
            />
          </button>
        </>
      )}

      {/* ======================== */}
      {/* Speak Button */}
      {/* ======================== */}
      <button
        type="button"
        onClick={() => {
          if (!hasContent || !hasHandlers.speak) return;
          onSpeakAction?.();
        }}
        disabled={!hasContent || !hasHandlers.speak}
        className={`${btnBase} ${theme} ${!hasContent || !hasHandlers.speak ? disabledBtn : ""
          }`}
        title={isAr ? "نطق" : "Read aloud"}
        aria-label={isAr ? "اقرأ النص بصوت مرتفع" : "Read message aloud"}
        aria-disabled={!hasContent || !hasHandlers.speak}
      >
        <Volume2
          className={`w-3.5 h-3.5 transition-transform duration-300 ${isSpeaking ? "text-emerald-400 animate-pulse scale-110" : ""
            }`}
        />
      </button>

      {/* ======================== */}
      {/* Edit Button (User only) */}
      {/* ======================== */}
      {canEdit && role === "user" && (
        <button
          type="button"
          onClick={() => {
            if (!hasContent || !hasHandlers.edit) return;
            onEditAction?.();
          }}
          disabled={!hasContent || !hasHandlers.edit}
          className={`${btnBase} ${theme} ${!hasContent || !hasHandlers.edit ? disabledBtn : ""
            }`}
          title={isAr ? "تعديل" : "Edit"}
          aria-label={isAr ? "تعديل الرسالة" : "Edit message"}
          aria-disabled={!hasContent || !hasHandlers.edit}
        >
          <Pencil className="w-3.5 h-3.5 transition-transform duration-300" />
        </button>
      )}

      {/* ======================== */}
      {/* Report Button (Assistant only) */}
      {/* ======================== */}
      {role === "assistant" && (
        <button
          type="button"
          onClick={() => {
            if (!hasHandlers.report) return;
            onReportAction?.();
          }}
          disabled={!hasHandlers.report}
          className={`${btnBase} ${theme} ${!hasHandlers.report ? disabledBtn : ""
            }`}
          title={isAr ? "إبلاغ" : "Report"}
          aria-label={isAr ? "إبلاغ عن هذه الرسالة" : "Report this message"}
          aria-disabled={!hasHandlers.report}
        >
          <Flag className="w-3.5 h-3.5 transition-transform duration-300" />
        </button>
      )}

      {/* ======================== */}
      {/* Share Button */}
      {/* ======================== */}
      <button
        type="button"
        onClick={() => {
          if (!hasContent || !hasHandlers.share) return;
          onShareAction?.();
        }}
        disabled={!hasContent || !hasHandlers.share}
        className={`${btnBase} ${theme} ${!hasContent || !hasHandlers.share ? disabledBtn : ""
          }`}
        title={isAr ? "مشاركة" : "Share"}
        aria-label={isAr ? "مشاركة الرسالة" : "Share message"}
        aria-disabled={!hasContent || !hasHandlers.share}
      >
        <Share2 className="w-3.5 h-3.5 transition-transform duration-300" />
      </button>
    </div>
  );
}