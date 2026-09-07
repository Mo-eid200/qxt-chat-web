"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Download, FileText, GripVertical, ExternalLink } from "lucide-react";

type DocumentPanelProps = {
  url: string;
  title: string;
  format: "pdf" | "docx" | "xlsx" | "pptx";
  isLoading?: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
};

const MIN_WIDTH_PERCENT = 20;
const MAX_WIDTH_PERCENT = 60;

const FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "Word",
  xlsx: "Excel",
  pptx: "PowerPoint",
};

// ✅ PDF renders natively in any modern browser via <iframe src="...">.
// Word/Excel/PowerPoint have no native browser viewer, so we route
// through Microsoft's free Office Online Viewer — it takes any
// publicly-reachable file URL (which R2 URLs are) and renders a real
// preview embedded in an iframe, no auth or setup needed on our side.
function getEmbedUrl(url: string, format: string): string {
  if (format === "pdf") return url;
  const encoded = encodeURIComponent(url);
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
}

export function DocumentPanel({
  url,
  title,
  format,
  isLoading,
  onClose,
  width,
  onWidthChange,
}: DocumentPanelProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filename = `${title || "document"}.${format}`;
  const embedUrl = url ? getEmbedUrl(url, format) : "";

  const handleDownload = useCallback(() => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  }, [url, filename]);

  // ── Resizable drag handle — identical behavior to CodePanel ──
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startX: e.clientX, startWidth: width };
      setIsDragging(true);
    },
    [width]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaX = dragRef.current.startX - e.clientX;
      const deltaPercent = (deltaX / window.innerWidth) * 100;
      const newWidth = Math.min(
        MAX_WIDTH_PERCENT,
        Math.max(MIN_WIDTH_PERCENT, dragRef.current.startWidth + deltaPercent)
      );
      onWidthChange(newWidth);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onWidthChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`relative h-full flex flex-col border-l border-white/10 bg-[#0a0a0b] shadow-2xl shadow-black/50 ${
        isDragging ? "" : "transition-all duration-300 ease-out"
      }`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className={`absolute left-0 top-0 bottom-0 w-1.5 -translate-x-1/2 cursor-col-resize z-10 flex items-center justify-center group ${
          isDragging ? "bg-amber-500/40" : "hover:bg-amber-500/20"
        }`}
      >
        <div className="h-12 w-1 rounded-full bg-white/10 group-hover:bg-amber-400/50 transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-black/40 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-100 truncate">{filename}</div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span className="uppercase tracking-wide text-amber-400/80 font-medium">
                {FORMAT_LABELS[format] || format}
              </span>
              {isLoading && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="animate-pulse">Generating...</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {url && (
            <button
              onClick={() => window.open(url, "_blank")}
              className="h-8 px-3 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 transition-colors text-xs font-medium flex items-center gap-1.5 border border-blue-500/40"
              aria-label="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!url}
            className="h-8 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 transition-colors text-xs font-medium flex items-center gap-1.5 border border-amber-500/40"
            aria-label="Download document"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Close panel"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document preview */}
      <div className="flex-1 overflow-hidden bg-zinc-900 flex items-center justify-center">
        {isLoading || !url ? (
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
            <span className="text-sm">Generating {FORMAT_LABELS[format] || format}...</span>
          </div>
        ) : (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title={filename}
          />
        )}
      </div>
    </div>
  );
}
DocumentPanel.displayName = "DocumentPanel";
