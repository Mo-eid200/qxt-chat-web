"use client";

import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Copy,
  Check,
  Download,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Share2,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import { AIStatus } from "./AIStatus";
import { MessageActions } from "./MessageActions";

import type { ChatMessage, Reaction } from "../../types/chat";

type AIStage = "thinking" | "analyzing" | "searching" | "generating" | "writing";

type Props = {
  messages: (ChatMessage & { tokens?: number; limit?: number })[];
  lang: "en" | "ar";
  assistantName: string;
  darkMode: boolean;

  messageDir: "rtl" | "ltr";
  messageTextAlign: "text-right" | "text-left";

  copiedIndex: number | null;
  reactions: Record<number, Reaction>;
  expandedMsgs: Record<number, boolean>;
  setExpandedMsgs: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;

  editingIndex: number | null;
  editingText: string;
  setEditingText: (v: string) => void;
  cancelEdit: () => void;
  saveEdit: () => void;
  startEdit: (idx: number, original: string) => void;

  handleCopy: (text: string, idx: number) => void;
  handleReaction: (idx: number, r: Reaction) => void;
  handleShare: (text: string) => void;
  handleReport: (text: string) => void;

  isLongText: (s: string) => boolean;
  clampText: (s: string) => string;

  busy: boolean;
  streaming: boolean;

  pendingStage?: AIStage | null;
  stageHistory?: AIStage[];

  bottomRef: React.RefObject<HTMLDivElement | null>;
};

/* ======================================================
   UTILS
====================================================== */

const resolveSafeUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== "string") return null;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
  if (apiBase) {
    return `${apiBase}/${url}`.replace(/\/+/g, "/");
  }

  return url;
};

const resolveSafeUrls = (urls: string[] | undefined): string[] => {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map(resolveSafeUrl).filter((u): u is string => u !== null);
};

/* ======================================================
   CODE BLOCK
====================================================== */

type CodeBlockProps = {
  children: React.ReactNode;
  className?: string;
};

const CodeBlock = memo(function CodeBlock({ children, className }: CodeBlockProps) {
  const language = className?.replace("language-", "") || "plaintext";
  const code = String(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return hljs.highlightAuto(code).value;
    }
  }, [code, language]);

  const lines = code.split("\n");
  const shouldCollapse = lines.length > 30;

  const handleCopyLocal = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  const displayLines = collapsed ? lines.slice(0, 20) : lines;

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-white/10 bg-black/50">
      <div className="flex items-center justify-between bg-black/60 px-4 py-2.5 border-b border-white/10">
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          {language || "code"}
        </span>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {shouldCollapse && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="h-7 px-2.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 transition-colors text-xs font-medium border border-emerald-500/40"
              aria-label={collapsed ? "Expand code" : "Collapse code"}
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
          )}
          <button
            onClick={handleCopyLocal}
            className="h-7 px-2.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 transition-colors text-xs font-medium flex items-center gap-1.5 border border-emerald-500/40"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-black/80">
        <pre
          className="p-4 text-sm overflow-x-auto leading-relaxed text-emerald-100 font-mono flex text-[13px]"
          dangerouslySetInnerHTML={{
            __html: `<span class="inline-block min-w-12 mr-4 text-emerald-400/40 select-none text-right pr-2">${displayLines
              .map((_, i) => i + 1)
              .join("\n")}</span><span class="flex-1">${highlighted}</span>`,
          }}
        />
      </div>

      {collapsed && shouldCollapse && (
        <div className="px-4 py-2 bg-black/60 border-t border-white/10 text-xs text-emerald-300/70 font-medium">
          ... {lines.length - 20} more lines
        </div>
      )}
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

/* ======================================================
   IMAGE MODAL
====================================================== */

const ImageModal = memo(function ImageModal({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const dragRef = useRef<{ startX: number }>({ startX: 0 });

  const currentImage = images[currentIndex] || "";

  useEffect(() => {
    setLoading(true);
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
  }, [images.length]);

  const handleZoom = useCallback(() => {
    setZoom((prev) => (prev === 1 ? 1.5 : 1));
  }, []);

  const handleShareLocal = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Shared image",
          text: "Check out this image",
          url: currentImage,
        });
      } else {
        await navigator.clipboard.writeText(currentImage);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Share failed", e);
      }
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, handleNext, handlePrev]);

  useEffect(() => {
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    const nextIndex = (currentIndex + 1) % images.length;

    [images[prevIndex], images[nextIndex]].forEach((src) => {
      if (src) {
        const img = new window.Image();
        img.src = src;
      }
    });
  }, [currentIndex, images]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      dragRef.current.startX = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - dragRef.current.startX;
        if (Math.abs(delta) > 50) {
          if (delta > 0) handlePrev();
          else handleNext();
          cleanup();
        }
      };

      const cleanup = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", cleanup);
      };

      document.addEventListener("mousemove", handleMouseMove, { passive: true });
      document.addEventListener("mouseup", cleanup, { passive: true });
    },
    [handleNext, handlePrev]
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/98 flex items-center justify-center z-50 backdrop-blur-lg"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center transition-all duration-200 z-10 hover:scale-110 hover:bg-red-500/40 group"
        title="Close (ESC)"
        aria-label="Close image viewer"
      >
        <X className="w-5 h-5 group-hover:text-red-400" />
      </button>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-3 rounded-full border border-white/10 hover:border-white/20 transition-colors duration-200">
        <a
          href={currentImage}
          download
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-emerald-400 transition-colors duration-200 hover:scale-110"
          title="Download"
          aria-label="Download image"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">Download</span>
        </a>

        <div className="w-px h-4 bg-white/20" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShareLocal();
          }}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-blue-400 transition-colors duration-200 hover:scale-110"
          title="Share"
          aria-label="Share image"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">Share</span>
        </button>

        <div className="w-px h-4 bg-white/20" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoom();
          }}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-yellow-400 transition-colors duration-200 hover:scale-110"
          title="Zoom (1.5x)"
          aria-label="Toggle zoom"
        >
          <ZoomIn className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">
            {zoom === 1 ? "Zoom" : "Reset"}
          </span>
        </button>
      </div>

      <div
        className="relative flex items-center justify-center max-h-[90vh] max-w-[95vw]"
        onMouseDown={handleMouseDown}
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 1), 3));
        }}
        onDoubleClick={handleZoom}
      >
        {loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 animate-pulse rounded-xl blur-md" />
        )}

        <img
          src={currentImage}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          className={`
            max-h-[90vh]
            max-w-[95vw]
            rounded-xl
            shadow-2xl
            transition-all
            duration-200
            ease-out
            object-contain
            cursor-grab
            active:cursor-grabbing
            ${loading ? "blur-md scale-105" : "blur-0 scale-100"}
          `}
          style={{ transform: `scale(${zoom})` }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-emerald-500/40 group"
            title="Previous (←)"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 group-hover:text-emerald-400" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-emerald-500/40 group"
            title="Next (→)"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 group-hover:text-emerald-400" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-black/60 backdrop-blur-md text-sm text-white font-semibold border border-white/10">
            {currentIndex + 1} <span className="text-gray-400">/</span>{" "}
            {images.length}
          </div>
        </>
      )}
    </div>
  );
});

ImageModal.displayName = "ImageModal";

/* ======================================================
   MARKDOWN CONTENT
====================================================== */

const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  const parts = useMemo(() => {
    if (!content || typeof content !== "string") return [];
    return content.split(/(```[\s\S]*?```)/);
  }, [content]);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        if (part.startsWith("```")) {
          const codeContent = part.replace(/```/g, "").trim();
          const firstLine = codeContent.split("\n")[0];
          const isLanguageMarked = /^[a-z0-9+-]+$/.test(firstLine);

          const language = isLanguageMarked ? firstLine : "";
          const code = isLanguageMarked
            ? codeContent.split("\n").slice(1).join("\n")
            : codeContent;

          return (
            <CodeBlock key={i} className={`language-${language}`}>
              {code}
            </CodeBlock>
          );
        }

        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-emerald-300">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="bg-black/40 px-1.5 py-0.5 rounded-md text-[12px] border border-white/10 font-mono text-emerald-100">
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-1 my-2 italic opacity-80">
                  {children}
                </blockquote>
              ),
              h1: ({ children }) => (
                <h1 className="text-xl font-bold my-3 first:mt-0 text-emerald-300">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold my-2 first:mt-0 text-emerald-300">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-bold my-2 first:mt-0 text-emerald-300">
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 my-2 ml-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 my-2 ml-2">{children}</ol>
              ),
              li: ({ children }) => <li className="text-[14px]">{children}</li>,
              table: ({ children }) => (
                <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
                  <table className="text-sm w-full border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-emerald-500/10 border-b border-emerald-500/30">
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left font-semibold border-r border-white/10 last:border-r-0">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 border-r border-white/10 last:border-r-0">
                  {children}
                </td>
              ),
            }}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </>
  );
});

MarkdownContent.displayName = "MarkdownContent";

/* ======================================================
   OPTIMIZED IMAGE COMPONENT
====================================================== */

const ChatImage = memo(function ChatImage({
  src,
  index,
  onClick,
}: {
  src: string;
  index: number;
  onClick: (index: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative bg-black/20 rounded-xl overflow-hidden border border-white/20 hover:border-emerald-400/60 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20">
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
      )}

      {error && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <span className="text-xs text-gray-400">Failed to load image</span>
        </div>
      )}

      <Image
        src={src}
        alt={`Message image ${index + 1}`}
        width={400}
        height={400}
        className="max-w-full w-full h-auto object-contain cursor-pointer transition-opacity duration-200"
        onClick={() => onClick(index)}
        onLoad={() => {
          setLoaded(true);
          setError(false);
        }}
        onError={() => {
          setLoaded(true);
          setError(true);
        }}
        loading="lazy"
        sizes="(max-width: 640px) 100vw, 400px"
      />
    </div>
  );
});

ChatImage.displayName = "ChatImage";

/* ======================================================
   MESSAGE BUBBLE
====================================================== */

const MessageBubble = memo(function MessageBubble({
  msg,
  idx,
  isUser,
  isAr,
  assistantName,
  darkMode,
  messageDir,
  copiedIndex,
  reactions,
  editingIndex,
  editingText,
  setEditingText,
  cancelEdit,
  saveEdit,
  startEdit,
  handleCopy,
  handleReaction,
  handleSpeak,
  speakingId,
  handleShare,
  handleReport,
  isStreaming,
}: any) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const images = resolveSafeUrls(msg.payload?.images ?? msg.images);
  const videos = resolveSafeUrls(msg.payload?.videos ?? msg.videos);

  const bubbleClass = isUser
    ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-emerald-50 shadow-emerald-500/25 rounded-3xl rounded-br-md"
    : "bg-gradient-to-br from-emerald-950/40 to-black/60 text-emerald-50 shadow-emerald-500/15 border border-emerald-500/20 rounded-3xl rounded-bl-md";

  // ✅ Voice-safe sanitize (NO trim for recording/stream_update)
  const sanitizedContent = useMemo(() => {
    const raw = msg.content == null ? "" : String(msg.content);
    if (msg.kind === "recording" || msg.kind === "stream_update") return raw;
    return raw.trim();
  }, [msg.content, msg.kind]);

  const usageRatio = msg.tokens && msg.limit ? msg.tokens / msg.limit : 0;

  const gridCols = useMemo(() => {
    if (images.length <= 1) return "grid-cols-1";
    if (images.length === 2) return "grid-cols-2";
    return "grid-cols-3";
  }, [images.length]);

  const handleSpeakClick = useCallback(() => {
    if (!sanitizedContent?.trim()) return;
    handleSpeak?.(sanitizedContent, String(idx));
  }, [handleSpeak, sanitizedContent, idx]);

  return (
    <>
      <div
        className={`group max-w-[85%] px-5 py-4 text-base leading-relaxed backdrop-blur-xl shadow-lg ${bubbleClass} transition-all duration-200 hover:shadow-xl`}
      >
        {!isUser && (
          <div className="text-xs font-semibold opacity-70 mb-2.5 tracking-wide flex items-center gap-1.5">
            <MessageCircle className="w-3 h-3" />
            {assistantName}
          </div>
        )}

        {editingIndex === idx ? (
          <div className="space-y-3">
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              dir={messageDir}
              rows={4}
              className="w-full resize-none rounded-lg px-4 py-3 text-sm outline-none border bg-black/40 border-emerald-500/30 text-emerald-50 focus:border-emerald-400 focus:bg-black/60"
              autoFocus
              aria-label="Edit message"
            />

            <div className={`flex gap-2 ${isAr ? "justify-start" : "justify-end"}`}>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded-lg text-sm border border-white/30 hover:bg-white/10 transition-all duration-200"
                aria-label="Cancel editing"
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200"
                aria-label="Save message"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {msg.kind === "recording" && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-300 font-medium">Recording...</span>
              </div>
            )}

            <div className="space-y-3">
              {images.length > 0 && (
                <div className={`grid gap-2 ${gridCols}`}>
                  {images.map((img: string, i: number) => (
                    <ChatImage key={i} src={img} index={i} onClick={setSelectedImageIndex} />
                  ))}
                </div>
              )}

              {videos.length > 0 && (
                <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                  {videos.map((vid: string, i: number) => (
                    <video
                      key={i}
                      src={vid}
                      controls
                      controlsList="nodownload"
                      className="rounded-xl max-w-full max-h-96 border border-white/20 shadow-lg"
                      aria-label={`Video ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {sanitizedContent ? (
                <div className="block break-words">
                  <MarkdownContent content={sanitizedContent} />
                  {isStreaming && (
                    <span className="animate-pulse inline text-emerald-400 ml-1">▌</span>
                  )}
                </div>
              ) : images.length === 0 &&
                videos.length === 0 &&
                msg.kind !== "recording" &&
                msg.kind !== "stream_update" ? (
                <span className="opacity-60 text-sm italic">{isAr ? "بدون نص" : "No text"}</span>
              ) : null}
            </div>

            {msg.tokens && (
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs opacity-70">
                <span className="font-medium">{msg.tokens.toLocaleString()} tokens</span>

                {usageRatio > 0 && (
                  <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${usageRatio > 0.8
                        ? "bg-red-500"
                        : usageRatio > 0.6
                          ? "bg-yellow-400"
                          : "bg-emerald-400"
                        }`}
                      style={{ width: `${Math.min(usageRatio * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <MessageActions
              role={isUser ? "user" : "assistant"}
              content={sanitizedContent}
              messageId={String(idx)}
              darkMode={darkMode}
              lang={isAr ? "ar" : "en"}
              canEdit={isUser}
              onCopyAction={() => handleCopy(sanitizedContent, idx)}
              onEditAction={() => startEdit(idx, sanitizedContent)}
              onReactionAction={(r: any) => handleReaction(idx, r)}
              onShareAction={() => handleShare(sanitizedContent)}
              onReportAction={() => handleReport(sanitizedContent)}
              onSpeakAction={handleSpeakClick}
              reaction={reactions[idx]}
              isCopied={copiedIndex === idx}
              isSpeaking={speakingId === String(idx)}
            />
          </>
        )}
      </div>

      {selectedImageIndex !== null && images.length > 0 && (
        <ImageModal
          images={images}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </>
  );
});

MessageBubble.displayName = "MessageBubble";

/* ======================================================
   MAIN
====================================================== */

function ChatMessagesComponent({
  messages,
  lang,
  assistantName,
  darkMode,
  messageDir,
  messageTextAlign,
  copiedIndex,
  reactions,
  editingIndex,
  editingText,
  setEditingText,
  cancelEdit,
  saveEdit,
  startEdit,
  handleCopy,
  handleReaction,
  handleShare,
  handleReport,
  isLongText,
  clampText,
  streaming,
  pendingStage,
  stageHistory = [],
  bottomRef,
}: Props) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const handleSpeakWrapper = useCallback(
    (text: string, id: string) => {
      if (!text?.trim()) return;

      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }

      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === "ar" ? "ar-EG" : "en-US";

      utter.onend = () => setSpeakingId(null);
      utter.onerror = () => setSpeakingId(null);

      setSpeakingId(id);
      window.speechSynthesis.speak(utter);
    },
    [speakingId, lang]
  );

  useEffect(() => {
    if (!messages.length) return;

    const lastIndex = messages.length - 1;
    const lastMsg = messages[lastIndex];

    const shouldAutoSpeak =
      streaming &&
      lastMsg.role === "assistant" &&
      (lastMsg.content?.length ?? 0) > 10 &&
      speakingId !== String(lastIndex);

    if (shouldAutoSpeak) {
      handleSpeakWrapper(lastMsg.content, String(lastIndex));
    }
  }, [messages, streaming, speakingId, handleSpeakWrapper]);

  useEffect(() => {
    if (streaming) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
  }, [streaming]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!streaming) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bottomRef, streaming]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-8 pt-6 px-4 overflow-x-hidden">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-center opacity-50">
          <div>
            <div className="text-5xl mb-4">💬</div>
            <p className="text-sm text-gray-400">Start a conversation...</p>
          </div>
        </div>
      ) : (

        messages.map((msg, idx) => {


          const raw = String(msg.content ?? "");
          const hasText = raw.replace(/\s|\u200B|\u200C|\u200D|\uFEFF/g, "").length > 0;

          const hasImages = resolveSafeUrls(msg.payload?.images ?? msg.images).length > 0;
          const hasVideos = resolveSafeUrls(msg.payload?.videos ?? msg.videos).length > 0;
          const hasDocs =
            Array.isArray((msg as any).documents) ? (msg as any).documents.length > 0 :
              Array.isArray((msg as any).payload?.documents) ? (msg as any).payload.documents.length > 0 :
                false;
          const hasAudio = !!(msg as any).audioUrl || !!(msg as any).payload?.audio_url || !!(msg as any).payload?.audioUrl;
          const kind = (msg as any).kind as string | undefined;

          const shouldHidePlaceholder =
            !hasText &&
            !hasImages &&
            !hasVideos &&
            !hasDocs &&
            !hasAudio &&
            kind !== "recording" &&
            kind !== "stream_update";

          if (shouldHidePlaceholder) return null;

          const isUser = msg.role === "user";
          const isLast = idx === messages.length - 1;
          const rowJustify = isUser ? "justify-end" : "justify-start";

          return (
            <div
              key={msg.id || idx}
              className={`flex ${rowJustify} min-w-0 animate-in fade-in slide-in-from-bottom-3 duration-300`}
            >
              <MessageBubble
                msg={msg}
                idx={idx}
                isUser={isUser}
                assistantName={assistantName}
                darkMode={darkMode}
                messageDir={messageDir}
                messageTextAlign={messageTextAlign}
                copiedIndex={copiedIndex}
                reactions={reactions}
                editingIndex={editingIndex}
                editingText={editingText}
                setEditingText={setEditingText}
                cancelEdit={cancelEdit}
                saveEdit={saveEdit}
                startEdit={startEdit}
                handleCopy={handleCopy}
                handleReaction={handleReaction}
                handleSpeak={handleSpeakWrapper}
                speakingId={speakingId}
                handleShare={handleShare}
                handleReport={handleReport}
                isStreaming={streaming && isLast && msg.role === "assistant"}
              />
            </div>
          );
        })
      )}

      {pendingStage && (
        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-3 duration-300">
          <AIStatus stage={pendingStage} history={stageHistory} showProgress={true} />
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}

export default memo(ChatMessagesComponent);