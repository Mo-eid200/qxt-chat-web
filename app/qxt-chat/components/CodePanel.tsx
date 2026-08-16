"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { X, Copy, Check, Download, FileCode2, GripVertical } from "lucide-react";
import hljs from "highlight.js";

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: "js", typescript: "ts", tsx: "tsx", jsx: "jsx",
  python: "py", java: "java", c: "c", cpp: "cpp", "c++": "cpp",
  csharp: "cs", "c#": "cs", go: "go", rust: "rs", ruby: "rb",
  php: "php", swift: "swift", kotlin: "kt", html: "html",
  css: "css", scss: "scss", json: "json", yaml: "yml", sql: "sql",
  bash: "sh", shell: "sh", plaintext: "txt",
};

type CodePanelProps = {
  code: string;
  language: string;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
};

const MIN_WIDTH_PERCENT = 20;
const MAX_WIDTH_PERCENT = 60;

export function CodePanel({ code, language, onClose, width, onWidthChange }: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const lines = useMemo(() => code.split("\n"), [code]);
  const filename = `code.${LANGUAGE_EXTENSIONS[language] || "txt"}`;

  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return hljs.highlightAuto(code).value;
    }
  }, [code, language]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, filename]);

  // ── Resizable drag handle ──
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
          isDragging ? "bg-blue-500/40" : "hover:bg-blue-500/20"
        }`}
      >
        <div className="h-12 w-1 rounded-full bg-white/10 group-hover:bg-blue-400/50 transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-black/40 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <FileCode2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-100 truncate">{filename}</div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span className="uppercase tracking-wide text-blue-400/80 font-medium">{language || "code"}</span>
              <span className="text-zinc-600">•</span>
              <span>{lines.length} lines</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopy}
            className="h-8 px-3 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 transition-colors text-xs font-medium flex items-center gap-1.5 border border-blue-500/40"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={handleDownload}
            className="h-8 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 transition-colors text-xs font-medium flex items-center gap-1.5 border border-amber-500/40"
            aria-label="Download code"
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

      {/* Code content */}
      <div className="flex-1 overflow-auto bg-black/80 qxt-scroll">
        <pre
          className="p-5 text-sm leading-relaxed text-zinc-100 font-mono flex text-[13px] min-h-full"
          dangerouslySetInnerHTML={{
            __html: `<span class="inline-block min-w-12 mr-4 text-blue-400/40 select-none text-right pr-2">${lines
              .map((_, i) => i + 1)
              .join("\n")}</span><span class="flex-1">${highlighted}</span>`,
          }}
        />
      </div>
    </div>
  );
}

CodePanel.displayName = "CodePanel";