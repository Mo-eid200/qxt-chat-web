"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Image as ImageIcon,
  Video,
  ScanText,
  FileText,
  Upload,
  X,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Loader2,
  Download,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { getVisionTheme } from "./visionTheme";
import {
  runOCR,
  generateVideo,
  getVideoJob,
  generateImage,
  getImageJob,
} from "@/app/lib/api/vision/generations";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

type Tool = "image" | "video" | "ocr" | "doc";
type ImageMode = "generate" | "edit";
type Aspect = "1:1" | "4:5" | "3:4" | "16:9" | "9:16";
type SizePreset = "1024" | "1536" | "2048";
type Quality = "fast" | "balanced" | "high";

type Props = { darkMode: boolean };

type HistoryItem = {
  id: string;
  tool: Tool;
  createdAt: number;
  title: string;
  kind: "image" | "text";
  prompt?: string;
  dataUrl?: string;
  text?: string;
};

const ASPECTS: { key: Aspect; label: string }[] = [
  { key: "1:1", label: "Square (1:1)" },
  { key: "4:5", label: "Portrait (4:5)" },
  { key: "3:4", label: "Portrait (3:4)" },
  { key: "16:9", label: "Landscape (16:9)" },
  { key: "9:16", label: "Story (9:16)" },
];

const STYLE_PRESETS = [
  { key: "photoreal", label: "Photo-real" },
  { key: "cinematic", label: "Cinematic" },
  { key: "studio", label: "Studio" },
  { key: "product", label: "Product Shot" },
  { key: "3d", label: "3D Render" },
  { key: "illustration", label: "Illustration" },
  { key: "anime", label: "Anime" },
];

const QUALITY_PRESETS: { key: Quality; label: string }[] = [
  { key: "fast", label: "Fast" },
  { key: "balanced", label: "Balanced" },
  { key: "high", label: "High" },
];

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/* =========================================================
   Visual System: Tool Meta + CSS Vars
========================================================= */
const TOOL_META: Record<
  Tool,
  {
    label: string;
    hint: string;
    accent: string;
    glow: string;
    washDark: string;
    washLight: string;
  }
> = {
  image: {
    label: "Image",
    hint: "Generate / Edit",
    accent: "#38BDF8",
    glow: "rgba(56,189,248,0.22)",
    washDark: "bg-[linear-gradient(90deg,rgba(56,189,248,0.16)_0%,rgba(56,189,248,0.06)_35%,transparent_75%)]",
    washLight: "bg-[linear-gradient(90deg,rgba(56,189,248,0.12)_0%,rgba(56,189,248,0.04)_35%,transparent_75%)]",
  },
  video: {
    label: "Video",
    hint: "Text → Video",
    accent: "#F59E0B",
    glow: "rgba(245,158,11,0.20)",
    washDark: "bg-[linear-gradient(90deg,rgba(245,158,11,0.14)_0%,rgba(245,158,11,0.05)_35%,transparent_75%)]",
    washLight: "bg-[linear-gradient(90deg,rgba(245,158,11,0.11)_0%,rgba(245,158,11,0.04)_35%,transparent_75%)]",
  },
  ocr: {
    label: "OCR",
    hint: "Extract Text",
    accent: "#10B981",
    glow: "rgba(16,185,129,0.20)",
    washDark: "bg-[linear-gradient(90deg,rgba(16,185,129,0.14)_0%,rgba(16,185,129,0.05)_35%,transparent_75%)]",
    washLight: "bg-[linear-gradient(90deg,rgba(16,185,129,0.11)_0%,rgba(16,185,129,0.04)_35%,transparent_75%)]",
  },
  doc: {
    label: "Docs",
    hint: "Document Intelligence",
    accent: "#A78BFA",
    glow: "rgba(167,139,250,0.20)",
    washDark: "bg-[linear-gradient(90deg,rgba(167,139,250,0.14)_0%,rgba(167,139,250,0.05)_35%,transparent_75%)]",
    washLight: "bg-[linear-gradient(90deg,rgba(167,139,250,0.11)_0%,rgba(167,139,250,0.04)_35%,transparent_75%)]",
  },
};

function toolVars(tool: Tool) {
  const m = TOOL_META[tool];
  return {
    ["--accent" as any]: m.accent,
    ["--glow" as any]: m.glow,
  } as React.CSSProperties;
}

function ringPremium(active: boolean) {
  return active
    ? "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_18px_90px_var(--glow)] ring-1 ring-white/12"
    : "shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-white/10 hover:ring-white/14 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_14px_80px_var(--glow)]";
}

function accentLine(darkMode: boolean) {
  return darkMode
    ? "bg-[linear-gradient(90deg,var(--accent),rgba(255,255,255,0.16),transparent)]"
    : "bg-[linear-gradient(90deg,var(--accent),rgba(15,23,42,0.10),transparent)]";
}

function pillBadge(darkMode: boolean) {
  return darkMode ? "border-white/12 bg-white/[0.06] text-white/85" : "border-slate-900/10 bg-white/80 text-slate-800";
}

/* =========================================================
   Suggestions Bar (per Tool) — UI-only
========================================================= */
type Template = {
  title: string;
  prompt: string;
  style?: string;
  quality?: Quality;
  aspect?: Aspect;
  steps?: number;
  guidance?: number;
  negative?: string;
};

const TEMPLATES: Record<Tool, Template[]> = {
  image: [
    {
      title: "Studio Portrait",
      prompt: "Ultra-realistic studio portrait, soft rim light, 85mm lens, shallow DOF, clean background, high detail",
      style: "studio",
      quality: "high",
      aspect: "4:5",
      steps: 32,
      guidance: 6.5,
      negative: "blurry, low quality, watermark, deformed hands, extra fingers, artifacts",
    },
    {
      title: "Product Shot",
      prompt: "Premium product shot on seamless background, softbox lighting, subtle reflections, clean composition, ultra detailed",
      style: "product",
      quality: "high",
      aspect: "1:1",
      steps: 30,
      guidance: 6.0,
      negative: "noise, messy background, text, logo, watermark, artifacts",
    },
    {
      title: "Cinematic Scene",
      prompt: "Cinematic scene, volumetric light, atmospheric haze, realistic materials, film grain, dramatic composition",
      style: "cinematic",
      quality: "balanced",
      aspect: "16:9",
      steps: 28,
      guidance: 6.5,
      negative: "overexposed, low detail, artifacts, watermark",
    },
  ],
  video: [
    {
      title: "Drone Push-In",
      prompt:
        "Cinematic drone shot over a neon city at night, slow push-in, rain, volumetric light, realistic reflections, smooth motion, 5–7 seconds",
    },
    {
      title: "Product Reveal",
      prompt:
        "Studio product reveal, slow rotating turntable, softbox lighting, shallow DOF, minimal background, smooth camera, 5–7 seconds",
    },
  ],
  ocr: [
    { title: "Arabic Receipt OCR", prompt: "Extract all text. Return JSON: {merchant, date, items[], total, vat, currency}." },
    { title: "ID OCR", prompt: "Extract fields. Return JSON. Keep Arabic + English values if available." },
  ],
  doc: [
    { title: "Invoice Extract", prompt: "Summarize + extract structured fields (invoiceNo, vendor, date, lineItems, totals). Return JSON." },
    { title: "Contract Summary", prompt: "Summarize key clauses, parties, dates, obligations, penalties. Return sections + bullets." },
  ],
};

function ToolTemplatesBar({
  darkMode,
  theme,
  tool,
  onApply,
}: {
  darkMode: boolean;
  theme: any;
  tool: Tool;
  onApply: (tpl: Template) => void;
}) {
  const list = TEMPLATES[tool] || [];
  if (!list.length) return null;

  return (
    <div style={toolVars(tool)} className="mt-3">
      <div className={cn("rounded-[26px] border overflow-hidden backdrop-blur-2xl", theme.border, darkMode ? "bg-black/36" : "bg-white/75", ringPremium(false))}>
        <div className={cn("h-[2px] w-full", accentLine(darkMode))} />

        <div className="px-3 md:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("text-[12px] font-semibold", theme.text)} />
            <span className={cn("text-[11px]", theme.muted)}>UI-only (visual templates will be added later)</span>
          </div>

          <div className={cn("text-[11px] flex items-center gap-2", theme.muted)}>
            <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent)] shadow-[0_0_20px_var(--glow)]" />
            {TOOL_META[tool].label}
          </div>
        </div>

        <div className="px-3 md:px-4 pb-4 flex gap-2 overflow-x-auto">
          {list.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => onApply(t)}
              className={cn(
                "min-w-[220px] rounded-3xl border px-3 py-3 text-left transition active:scale-[0.99]",
                theme.border,
                darkMode ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white/75 hover:bg-white",
                ringPremium(false)
              )}
            >
              <div className={cn("text-[12px] font-semibold", theme.text)}>{t.title}</div>
              <div className={cn("mt-1 text-[11px] line-clamp-2", theme.muted)}>{t.prompt}</div>
              <div className="mt-2 h-[2px] w-full rounded-full bg-[linear-gradient(90deg,var(--accent),transparent)] opacity-80" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Command Bar
========================================================= */
function StudioCommandBar({
  darkMode,
  theme,
  tool,
  setTool,
  hoverTool,
  setHoverTool,
  loading,
  toast,
}: {
  darkMode: boolean;
  theme: any;
  tool: Tool;
  setTool: (t: Tool) => void;
  hoverTool: Tool | null;
  setHoverTool: (t: Tool | null) => void;
  loading: boolean;
  toast: { type: "ok" | "err"; msg: string } | null;
}) {
  const preview = TOOL_META[hoverTool ?? tool];

  const Tab = ({ k, icon, title, sub }: { k: Tool; icon: React.ReactNode; title: string; sub: string }) => {
    const active = tool === k;

    return (
      <button
        type="button"
        onMouseEnter={() => setHoverTool(k)}
        onMouseLeave={() => setHoverTool(null)}
        onClick={() => setTool(k)}
        style={toolVars(k)}
        className={cn(
          "relative h-11 px-3 rounded-3xl border transition flex items-center gap-2 min-w-[150px] active:scale-[0.99]",
          theme.border,
          darkMode ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white/70 hover:bg-white",
          ringPremium(active)
        )}
      >
        <div className={cn("h-9 w-9 rounded-2xl border flex items-center justify-center", theme.border, darkMode ? "bg-black/25" : "bg-white/80")}>{icon}</div>

        <div className="leading-tight text-left">
          <div className={cn("text-[12px] font-semibold", theme.text)}>{title}</div>
          <div className={cn("text-[10px]", theme.muted)}>{sub}</div>
        </div>

        {active && <span className={cn("ml-auto px-2 py-[2px] rounded-xl border text-[10px] font-semibold", pillBadge(darkMode))}>Active</span>}
      </button>
    );
  };

  return (
    <div className="mt-3">
      <div className="w-full px-2 md:px-3" style={toolVars(tool)}>
        <div className="relative w-full flex justify-center">
          <div className="pointer-events-none absolute -inset-x-6 -top-6 h-24 opacity-60 blur-2xl" style={{ background: "radial-gradient(closest-side, var(--glow), transparent 70%)" }} />

          <div
            className={cn(
              "relative rounded-[999px] border px-3 py-2",
              "backdrop-blur-2xl",
              "flex items-center gap-2",
              theme.border,
              darkMode ? "bg-white/[0.03]" : "bg-white/70",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-white/10"
            )}
          >
            <Tab k="image" icon={<ImageIcon className="w-4 h-4 opacity-90" />} title="Image" sub="Generate / Edit" />
            <Tab k="video" icon={<Video className="w-4 h-4 opacity-90" />} title="Video" sub="Text → Video" />
            <Tab k="ocr" icon={<ScanText className="w-4 h-4 opacity-90" />} title="OCR" sub="Extract Text" />
            <Tab k="doc" icon={<FileText className="w-4 h-4 opacity-90" />} title="Docs" sub="Document Intelligence" />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className={cn("text-[12px]", theme.muted)}>
            Status:{" "}
            <span className={cn("font-semibold", loading ? (darkMode ? "text-amber-300" : "text-amber-700") : darkMode ? "text-emerald-300" : "text-emerald-700")}>
              {loading ? "Processing" : "Ready"}
            </span>

            {hoverTool && hoverTool !== tool && (
              <span className={cn("ml-2 px-2 py-[2px] rounded-xl border text-[10px] font-semibold", pillBadge(darkMode))}>
                Previewing {preview.label}
              </span>
            )}
          </div>

          {toast && (
            <div
              className={cn(
                "rounded-2xl border px-3 py-2 flex items-center gap-2 text-[12px]",
                toast.type === "ok"
                  ? darkMode
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-50"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-900"
                  : darkMode
                  ? "border-rose-400/30 bg-rose-500/10 text-rose-50"
                  : "border-rose-500/20 bg-rose-500/10 text-rose-900"
              )}
            >
              {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4 opacity-90" /> : <AlertTriangle className="w-4 h-4 opacity-90" />}
              <span className="opacity-95">{toast.msg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Main Studio — FIXED LAYOUT
   LEFT (7): Create + Big Canvas
   RIGHT (5): Inspector
========================================================= */
export function VisionStudio({ darkMode }: Props) {
  const theme = useMemo(() => getVisionTheme(darkMode), [darkMode]);

  const [tool, setTool] = useState<Tool>("image");
  const [hoverTool, setHoverTool] = useState<Tool | null>(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  const active = useMemo(() => history.find((x) => x.id === activeId) || null, [history, activeId]);

  const [imageMode, setImageMode] = useState<ImageMode>("generate");
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [style, setStyle] = useState(STYLE_PRESETS[1].key);
  const [quality, setQuality] = useState<Quality>("balanced");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [size, setSize] = useState<SizePreset>("1024");
  const [seed, setSeed] = useState<string>("");
  const [steps, setSteps] = useState<number>(28);
  const [guidance, setGuidance] = useState<number>(6.5);

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [inspectorOpen, setInspectorOpen] = useState(true);

  const selectedMeta = TOOL_META[tool];

  const ui = useMemo(() => {
    const panel = cn("backdrop-blur-2xl border rounded-[28px]", theme.glass, theme.border);
    const softSurface = darkMode ? "bg-white/[0.03]" : "bg-slate-50/80";
    const btnSoft = cn(
      "border rounded-3xl transition active:scale-[0.99]",
      theme.border,
      darkMode ? "bg-white/[0.05] hover:bg-white/[0.08] text-white" : "bg-white/80 hover:bg-white text-slate-900"
    );
    const inputCls = cn("border outline-none focus:ring-2 transition", theme.border, theme.input);
    const kbd = cn("px-2 py-[2px] rounded-lg border text-[11px]", theme.border, darkMode ? "bg-white/[0.04] text-white/75" : "bg-white text-slate-700");
    return { panel, btnSoft, input: inputCls, kbd, soft: theme.text, mut: theme.muted, softSurface };
  }, [darkMode, theme]);

  const canUpload = tool === "ocr" || tool === "doc" || (tool === "image" && imageMode === "edit");

  useEffect(() => {
    return () => {
      if (filePreview?.startsWith("blob:")) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  useEffect(() => {
    setToast(null);
    setFile(null);
    if (filePreview?.startsWith("blob:")) URL.revokeObjectURL(filePreview);
    setFilePreview("");
    if (tool !== "image") setImageMode("generate");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  function pushToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    window.clearTimeout((pushToast as any)._t);
    (pushToast as any)._t = window.setTimeout(() => setToast(null), 2600);
  }

  function onPickFile() {
    fileInputRef.current?.click();
  }

  function onFileSelected(f: File | null) {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setFilePreview(url);
    pushToast("ok", `Loaded: ${f.name}`);
  }

  function clearFile() {
    setFile(null);
    if (filePreview?.startsWith("blob:")) URL.revokeObjectURL(filePreview);
    setFilePreview("");
  }

  function randomSeed() {
    const s = Math.floor(Math.random() * 1_000_000_000).toString();
    setSeed(s);
    pushToast("ok", `Seed set: ${s}`);
  }

  function resetImageSettings() {
    setNegative("");
    setStyle(STYLE_PRESETS[1].key);
    setQuality("balanced");
    setAspect("1:1");
    setSize("1024");
    setSeed("");
    setSteps(28);
    setGuidance(6.5);
    pushToast("ok", "Image settings reset");
  }

  function clearHistory() {
    setHistory([]);
    setActiveId("");
    pushToast("ok", "History cleared");
  }

  async function copyText(t: string) {
    try {
      await navigator.clipboard.writeText(t);
      pushToast("ok", "Copied");
    } catch {
      pushToast("err", "Copy failed");
    }
  }

  function downloadDataUrl(dataUrl: string, name = "qxt-vision.png") {
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = name;
      a.target = "_blank";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      pushToast("ok", "Download started");
    } catch {
      pushToast("err", "Download failed");
    }
  }

  function ensureCanvasSelection(newId: string) {
    setActiveId(newId);
  }

  function applyTemplate(tpl: Template) {
    setPrompt(tpl.prompt || "");
    if (tpl.negative !== undefined) setNegative(tpl.negative);
    if (tpl.style) setStyle(tpl.style);
    if (tpl.quality) setQuality(tpl.quality);
    if (tpl.aspect) setAspect(tpl.aspect);
    if (typeof tpl.steps === "number") setSteps(tpl.steps);
    if (typeof tpl.guidance === "number") setGuidance(tpl.guidance);
    pushToast("ok", `Applied: ${tpl.title}`);
  }

async function runTool() {
  // ================= VALIDATION =================
  if (tool === "image") {
    if (!prompt.trim()) {
      pushToast("err", "Write a prompt first.");
      return;
    }
    if (imageMode === "edit" && !file) {
      pushToast("err", "Upload an image for edit mode.");
      return;
    }
  }

  if (tool === "video" && !prompt.trim()) {
    pushToast("err", "Write a prompt first.");
    return;
  }

  if ((tool === "ocr" || tool === "doc") && !file) {
    pushToast("err", "Upload a file first.");
    return;
  }

  setLoading(true);

  try {
    // =========================================================
    // OCR + DOC (same endpoint)
    // =========================================================
    if ((tool === "ocr" || tool === "doc") && file) {
      const form = new FormData();
      form.append("file", file);

      const res = await runOCR(form);

      const id = crypto.randomUUID();

      const item: HistoryItem = {
        id,
        tool,
        createdAt: Date.now(),
        title: file.name
          ? `${tool === "ocr" ? "OCR" : "Doc"} • ${file.name}`
          : tool === "ocr"
          ? "OCR"
          : "Document",
        kind: "text",
        text: JSON.stringify(res, null, 2),
      };

      setHistory((p) => [item, ...p]);
      ensureCanvasSelection(id);

      pushToast(
        "ok",
        tool === "ocr" ? "OCR completed" : "Document analyzed"
      );
      return;
    }

    // =========================================================
    // VIDEO
    // =========================================================
    if (tool === "video") {
      const res = await generateVideo({
        prompt: prompt.trim(),
      });

      const jobId = res.job_id;
      if (!jobId) throw new Error("No job id returned");

      let status = "running";
      let videoUrl = "";

      while (status === "running") {
        await new Promise((r) => setTimeout(r, 2000));

        const job = await getVideoJob(jobId);
        status = job.status;

        if (status === "done") {
          videoUrl = job.output_url;
          break;
        }

        if (status === "failed") {
          throw new Error(job.error || "Video generation failed");
        }
      }

      if (!videoUrl) throw new Error("No video returned");

      const id = crypto.randomUUID();

      const item: HistoryItem = {
        id,
        tool,
        createdAt: Date.now(),
        title: "Video • Generated",
        kind: "text",
        text: videoUrl,
        prompt: prompt.trim(),
      };

      setHistory((p) => [item, ...p]);
      ensureCanvasSelection(id);

      pushToast("ok", "Video ready");
      return;
    }

    // =========================================================
    // IMAGE
    // =========================================================
    if (tool === "image") {
      const res = await generateImage({
        prompt: prompt.trim(),
        size,
        steps,
        guidance,
        seed: seed || undefined,
      });

      const jobId = res.job_id;
      if (!jobId) throw new Error("No job id returned");

      let status = "running";
      let imageUrl = "";

      while (status === "running") {
        await new Promise((r) => setTimeout(r, 1500));

        const job = await getImageJob(jobId);
        status = job.status;

        if (status === "done") {
          imageUrl = job.output?.[0] || job.output_url;
          break;
        }

        if (status === "failed") {
          throw new Error(job.error || "Image generation failed");
        }
      }

      if (!imageUrl) throw new Error("No image returned");

      const id = crypto.randomUUID();

      const item: HistoryItem = {
        id,
        tool,
        createdAt: Date.now(),
        title:
          imageMode === "generate"
            ? "Image • Generated"
            : "Image • Edited",
        kind: "image",
        prompt: prompt.trim(),
        dataUrl: imageUrl,
      };

      setHistory((p) => [item, ...p]);
      ensureCanvasSelection(id);

      pushToast(
        "ok",
        imageMode === "generate" ? "Generated" : "Edited"
      );

      return;
    }
  } catch (e: any) {
    pushToast("err", e?.response?.data?.detail || e?.message || "Failed");
  } finally {
    setLoading(false);
  }
}


const SegBtn = ({ active, label, onClick }:{ active: boolean; label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      style={toolVars(tool)}
      className={cn(
        "h-9 px-3 rounded-3xl border text-[12px] transition active:scale-[0.99]",
        theme.border,
        active
          ? darkMode
            ? "bg-white/[0.10] text-white shadow-[0_12px_60px_var(--glow)]"
            : "bg-slate-900/[0.05] text-slate-900 shadow-[0_12px_50px_var(--glow)]"
          : darkMode
          ? "bg-white/[0.04] hover:bg-white/[0.06] text-white/75"
          : "bg-white/75 hover:bg-white text-slate-700"
      )}
    >
      {label}
    </button>
  );

  const SectionShell = ({
    children,
    title,
    right,
    tone = "default",
    className,
  }: {
    children: React.ReactNode;
    title: string;
    right?: React.ReactNode;
    tone?: "default" | "canvas" | "inspector";
    className?: string;
  }) => {
    const wash = darkMode ? selectedMeta.washDark : selectedMeta.washLight;

    const extra =
      tone === "canvas"
        ? "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_22px_120px_var(--glow)]"
        : tone === "inspector"
        ? "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_16px_80px_rgba(0,0,0,0.35)]"
        : "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_20px_100px_rgba(0,0,0,0.45)]";

    return (
      <div style={toolVars(tool)} className={cn("p-4 relative overflow-hidden", ui.panel, extra, className)}>
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-16 opacity-80", wash)} />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[color:var(--accent)] shadow-[0_0_20px_var(--glow)]" />
              <div className={cn("text-[13px] font-semibold", ui.soft)}>{title}</div>
              <span className={cn("px-2 py-[2px] rounded-xl border text-[10px] font-semibold", pillBadge(darkMode))}>{selectedMeta.label}</span>
            </div>
            <div className={cn("text-[11px] mt-0.5", ui.mut)}>{selectedMeta.hint}</div>
          </div>
          {right}
        </div>
        <div className="relative">{children}</div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* ===== Global Background ===== */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#060A12]" />
        <div className="absolute -top-44 -left-44 h-[560px] w-[560px] rounded-full bg-sky-500/20 blur-[140px]" />
        <div className="absolute top-10 -right-44 h-[560px] w-[560px] rounded-full bg-indigo-500/16 blur-[140px]" />
        <div className="absolute bottom-[-180px] left-1/3 h-[640px] w-[640px] rounded-full bg-cyan-400/12 blur-[170px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.32)_55%,rgba(0,0,0,0.72)_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:46px_46px]" />
      </div>

      <div className="w-full py-2">
        <StudioCommandBar
          darkMode={darkMode}
          theme={theme}
          tool={tool}
          setTool={setTool}
          hoverTool={hoverTool}
          setHoverTool={setHoverTool}
          loading={loading}
          toast={toast}
        />

        <ToolTemplatesBar darkMode={darkMode} theme={theme} tool={tool} onApply={applyTemplate} />

        {/* ===== FIXED GRID ===== */}
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* LEFT: Create + Big Canvas */}
          <div className="xl:col-span-7 space-y-5">
            {/* CREATE */}
            <SectionShell
              title={tool === "image" ? "Create" : tool === "video" ? "Video Prompt" : tool === "ocr" ? "OCR Input" : "Document Input"}
              right={
                <button
                  type="button"
                  onClick={() => setInspectorOpen((v) => !v)}
                  className={cn("h-9 px-3 rounded-3xl border flex items-center gap-2 text-[12px]", theme.border, ui.btnSoft, ringPremium(false))}
                >
                  <SlidersHorizontal className="w-4 h-4 opacity-80" />
                  <span className="opacity-85">{inspectorOpen ? "Hide Settings" : "Show Settings"}</span>
                  <ChevronDown className={cn("w-4 h-4 opacity-70 transition", inspectorOpen && "rotate-180")} />
                </button>
              }
            >
              <div className={cn("text-[11px] mt-2", ui.mut)}>
                {tool === "image"
                  ? "Write a prompt. Upload an image only if you want to edit."
                  : tool === "video"
                  ? "Describe the scene, camera, and motion."
                  : tool === "ocr"
                  ? "Upload an image and extract text."
                  : "Upload a PDF or image and extract structured insights."}
              </div>

              {tool === "image" && (
                <div className="mt-4 flex items-center gap-2">
                  <SegBtn active={imageMode === "generate"} label="Generate" onClick={() => setImageMode("generate")} />
                  <SegBtn active={imageMode === "edit"} label="Edit" onClick={() => setImageMode("edit")} />
                </div>
              )}

              {(tool === "ocr" || tool === "doc" || (tool === "image" && imageMode === "edit")) && (
                <div className="mt-4">
                  <div className="mt-6 flex flex-col gap-3">
                    <div className={cn("text-[12px] font-semibold", ui.soft)}>{tool === "doc" ? "Document" : "Input Image"}</div>
                    {file && (
                      <button
                        type="button"
                        onClick={clearFile}
                        className={cn("h-9 px-3 rounded-3xl border text-[12px] flex items-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                      >
                        <X className="w-4 h-4 opacity-80" />
                        <span className="opacity-85">Remove</span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={tool === "doc" ? "application/pdf,image/*" : "image/*"}
                    className="hidden"
                    onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
                  />

                  {!file ? (
                    <button
                      type="button"
                      onClick={onPickFile}
                      className={cn(
                        "mt-2 w-full h-28 rounded-[28px] border border-dashed transition flex flex-col items-center justify-center gap-2 active:scale-[0.99]",
                        theme.border,
                        darkMode ? "bg-white/[0.03] hover:bg-white/[0.05]" : "bg-white/75 hover:bg-white",
                        "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_90px_var(--glow)]"
                      )}
                      style={toolVars(tool)}
                    >
                      <div className={cn("h-10 w-10 rounded-2xl border flex items-center justify-center", theme.border, darkMode ? "bg-black/30" : "bg-white")}>
                        <Upload className="w-5 h-5 opacity-80" />
                      </div>
                      <div className={cn("text-[12px] font-semibold", ui.soft)}>{tool === "doc" ? "Upload document" : "Upload image"}</div>
                      <div className={cn("text-[11px]", ui.mut)}>{tool === "doc" ? "PDF / PNG / JPG / WebP" : "PNG / JPG / WebP"}</div>
                    </button>
                  ) : (
                    <div className={cn("mt-2 rounded-[28px] border overflow-hidden", theme.border, darkMode ? "bg-black/20" : "bg-white/80", ringPremium(false))}>
                      <div className={cn("px-3 py-2 flex items-center justify-between border-b", theme.border)}>
                        <div className={cn("text-[12px] font-semibold", ui.soft)}>{file.name}</div>
                        <div className={cn("text-[11px]", ui.mut)}>{Math.round(file.size / 1024)} KB</div>
                      </div>

                      {filePreview && (tool !== "doc" || file.type.startsWith("image/")) && (
                        <div className="p-3">
                          <div className={cn("relative w-full aspect-[16/10] rounded-3xl overflow-hidden border", theme.border, darkMode ? "bg-black/40" : "bg-white")}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}

                      {tool === "doc" && file.type === "application/pdf" && (
                        <div className={cn("p-3 text-[11px]", ui.mut)}>PDF detected. Preview will appear in the canvas after connecting the endpoint.</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(tool === "image" || tool === "video" || tool === "doc") && (
                <div className="mt-4">
                  <label className={cn("text-[12px] font-semibold", ui.soft)}>{tool === "doc" ? "Instruction (optional)" : "Prompt"}</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      tool === "image"
                        ? "Ultra-realistic studio portrait, soft rim light, 85mm lens, shallow depth of field, clean background..."
                        : tool === "video"
                        ? "Cinematic drone shot over a neon city at night, slow push-in, rain, volumetric light..."
                        : "Extract entities, summarize, and return structured fields (invoice, contract, form)..."
                    }
                    className={cn("mt-2 w-full min-h-[120px] rounded-[28px] border px-3 py-3 text-[13px] outline-none focus:ring-2 transition", ui.input)}
                  />
                  {tool === "image" && (
                    <div className={cn("mt-2 text-[11px]", ui.mut)}>
                      Tip: <span className={ui.kbd}>subject</span> + <span className={ui.kbd}>lighting</span> + <span className={ui.kbd}>lens</span> + <span className={ui.kbd}>background</span> = better results.
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={runTool}
                style={toolVars(tool)}
                className={cn(
                  "mt-4 w-full h-12 px-4 flex items-center justify-center gap-2 rounded-[26px] border text-[13px] font-semibold transition active:scale-[0.99]",
                  theme.border,
                  darkMode ? "bg-white/[0.06] hover:bg-white/[0.10] text-white" : "bg-white/85 hover:bg-white text-slate-900",
                  "shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_18px_90px_var(--glow)]",
                  loading && "opacity-75 cursor-not-allowed"
                )}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                <span>
                  {loading
                    ? "Working..."
                    : tool === "image"
                    ? imageMode === "generate"
                      ? "Generate"
                      : "Apply Edit"
                    : tool === "video"
                    ? "Generate Video"
                    : tool === "ocr"
                    ? "Run OCR"
                    : "Analyze Document"}
                </span>
              </button>

              <div className={cn("mt-2 text-[11px]", ui.mut)}>UI-only mock. Connect your API later for Image / Video / OCR / Document Intelligence.</div>
            </SectionShell>

            {/* DIVIDER */}
            <div style={toolVars(tool)} className="h-px w-full bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-45" />

            {/* CANVAS (BIGGER) */}
            <SectionShell
              title="Canvas"
              tone="canvas"
              className="min-h-[540px]"  // ✅ يخلي الكارد نفسه كبير
              right={
                <button
                  type="button"
                  onClick={clearHistory}
                  className={cn("h-9 px-3 rounded-3xl border text-[12px] flex items-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                >
                  <Trash2 className="w-4 h-4 opacity-80" />
                  <span className="opacity-85">Clear</span>
                </button>
              }
            >
              <div className={cn("text-[11px] mt-2", ui.mut)}>{active ? `Selected • ${active.title}` : "Run a tool to see output here."}</div>

              {!active ? (
                <div className={cn("mt-4 p-6 rounded-[28px] border", theme.border, darkMode ? "bg-white/[0.03]" : "bg-white/80", ringPremium(false))}>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-11 w-11 rounded-3xl border flex items-center justify-center", theme.border, darkMode ? "bg-black/30" : "bg-white")}>
                      <Sparkles className="w-5 h-5 opacity-80" />
                    </div>
                    <div>
                      <div className={cn("text-[12px] font-semibold", ui.soft)}>No output yet</div>
                      <div className={cn("text-[11px]", ui.mut)}>Use suggestions or write a prompt, then run.</div>
                    </div>
                  </div>
                </div>
              ) : active.kind === "image" ? (
                <div className="mt-4">
                  <div
                    style={toolVars(tool)}
                    className={cn(
                      "relative w-full aspect-[16/9] rounded-[28px] overflow-hidden border", // ✅ أكبر وأجمل
                      theme.border,
                      darkMode ? "bg-black/40" : "bg-white",
                      "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_26px_140px_var(--glow)] ring-1 ring-white/10"
                    )}
                  >
                    {active.dataUrl?.startsWith("/") ? (
                      <Image src={active.dataUrl} alt="Canvas" fill className="object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={active.dataUrl || ""} alt="Canvas" className="w-full h-full object-cover" />
                    )}
                  </div>

                  {active.prompt && (
                    <div className={cn("mt-3 text-[12px] leading-relaxed", darkMode ? "text-white/75" : "text-slate-800")}>
                      <span className={cn(darkMode ? "text-white/50" : "text-slate-500")}>Prompt: </span>
                      {active.prompt}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => active.prompt && copyText(active.prompt)}
                      className={cn("h-9 px-3 rounded-3xl border text-[12px] flex items-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                    >
                      <Copy className="w-4 h-4 opacity-80" />
                      <span className="opacity-85">Copy Prompt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => active.dataUrl && downloadDataUrl(active.dataUrl)}
                      className={cn("h-9 px-3 rounded-3xl border text-[12px] flex items-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                    >
                      <Download className="w-4 h-4 opacity-80" />
                      <span className="opacity-85">Download</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <div
                    style={toolVars(tool)}
                    className={cn(
                      "rounded-[28px] border p-4",
                      theme.border,
                      darkMode ? "bg-black/25" : "bg-white/80",
                      "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_26px_130px_var(--glow)]",
                      "min-h-[420px]" // ✅ نصوص كبيرة وواضحة
                    )}
                  >
                    <pre className={cn("whitespace-pre-wrap text-[12px] leading-relaxed", darkMode ? "text-white/80" : "text-slate-800")}>{active.text}</pre>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => active.text && copyText(active.text)}
                      className={cn("h-9 px-3 rounded-3xl border text-[12px] flex items-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                    >
                      <Copy className="w-4 h-4 opacity-80" />
                      <span className="opacity-85">Copy Text</span>
                    </button>
                  </div>
                </div>
              )}
            </SectionShell>
          </div>

          {/* RIGHT: INSPECTOR (NOT BIGGER) */}
          <div className="xl:col-span-5">
            <SectionShell
              title="Inspector"
              tone="inspector"
              right={
                <button
                  type="button"
                  onClick={() => setInspectorOpen((v) => !v)}
                  className={cn("h-9 px-3 rounded-3xl border text-[12px] flex items-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                >
                  <SlidersHorizontal className="w-4 h-4 opacity-80" />
                  <span className="opacity-85">{inspectorOpen ? "Hide" : "Show"}</span>
                </button>
              }
            >
              <div className={cn("text-[11px] mt-2", ui.mut)}>Settings and history.</div>

              {inspectorOpen && (
                <div className={cn("mt-4 rounded-[28px] border", theme.border, ui.softSurface, "overflow-hidden")}>
                  <div className={cn("max-h-[78vh] overflow-y-auto p-3")}>
                    {tool === "image" ? (
                      <div className="space-y-3">
                        <Select
                          label="Style"
                          value={style}
                          onChange={setStyle}
                          options={STYLE_PRESETS.map((x) => ({ value: x.key, label: x.label }))}
                          ui={{ soft: ui.soft, input: ui.input }}
                          darkMode={darkMode}
                        />

                        <Select
                          label="Quality"
                          value={quality}
                          onChange={(v) => setQuality(v as Quality)}
                          options={QUALITY_PRESETS.map((x) => ({ value: x.key, label: x.label }))}
                          ui={{ soft: ui.soft, input: ui.input }}
                          darkMode={darkMode}
                        />

                        <Select
                          label="Aspect"
                          value={aspect}
                          onChange={(v) => setAspect(v as Aspect)}
                          options={ASPECTS.map((x) => ({ value: x.key, label: x.label }))}
                          ui={{ soft: ui.soft, input: ui.input }}
                          darkMode={darkMode}
                        />

                        <Select
                          label="Base Size"
                          value={size}
                          onChange={(v) => setSize(v as SizePreset)}
                          options={[
                            { value: "1024", label: "1024" },
                            { value: "1536", label: "1536" },
                            { value: "2048", label: "2048" },
                          ]}
                          ui={{ soft: ui.soft, input: ui.input }}
                          darkMode={darkMode}
                        />

                        <div className={cn("rounded-[24px] border p-3", theme.border, darkMode ? "bg-white/[0.03]" : "bg-white/80", ringPremium(false))}>
                          <label className={cn("text-[12px] font-semibold", ui.soft)}>Negative Prompt</label>
                          <input
                            value={negative}
                            onChange={(e) => setNegative(e.target.value)}
                            placeholder="low quality, blurry, watermark, deformed hands..."
                            className={cn("mt-2 w-full h-11 rounded-3xl px-3 text-[13px] focus:ring-2", ui.input)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <NumberField label="Steps" value={steps} setValue={setSteps} min={10} max={60} ui={{ soft: ui.soft, input: ui.input }} />
                          <NumberField label="Guidance" value={guidance} setValue={setGuidance} min={1} max={12} step={0.5} ui={{ soft: ui.soft, input: ui.input }} />
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className={cn("text-[12px] font-semibold", ui.soft)}>Seed (optional)</label>
                            <input
                              value={seed}
                              onChange={(e) => setSeed(e.target.value)}
                              placeholder="e.g. 123456"
                              className={cn("mt-2 w-full h-11 rounded-3xl px-3 text-[13px] focus:ring-2", ui.input)}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={randomSeed}
                            style={toolVars(tool)}
                            className={cn("mt-[26px] h-11 px-3 rounded-3xl border text-[12px] flex items-center gap-2", theme.border, ui.btnSoft, "shadow-[0_16px_70px_var(--glow)]")}
                          >
                            <Sparkles className="w-4 h-4 opacity-80" />
                            <span className="opacity-85">Random</span>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={resetImageSettings}
                            className={cn("h-11 flex-1 rounded-3xl border text-[12px] flex items-center justify-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                          >
                            <Trash2 className="w-4 h-4 opacity-80" />
                            <span className="opacity-85">Reset</span>
                          </button>

                          <button
                            type="button"
                            onClick={clearFile}
                            className={cn("h-11 flex-1 rounded-3xl border text-[12px] flex items-center justify-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                          >
                            <X className="w-4 h-4 opacity-80" />
                            <span className="opacity-85">Clear Input</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={cn("rounded-[24px] border p-4", theme.border, darkMode ? "bg-white/[0.03]" : "bg-white/80", ringPremium(false))}>
                        <div className={cn("text-[12px] font-semibold", ui.soft)}>Tool Settings</div>
                        <div className={cn("text-[11px] mt-1", ui.mut)}>Defaults for now. Add advanced controls after connecting the endpoint.</div>
                      </div>
                    )}

                    {/* HISTORY */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <div className={cn("text-[12px] font-semibold", ui.soft)}>History</div>
                        <button
                          type="button"
                          onClick={clearHistory}
                          className={cn("h-8 px-3 rounded-3xl border text-[12px] flex items-center gap-2", theme.border, ui.btnSoft, ringPremium(false))}
                        >
                          <Trash2 className="w-4 h-4 opacity-80" />
                          <span className="opacity-85">Clear</span>
                        </button>
                      </div>

                      {history.length === 0 ? (
                        <div className={cn("mt-2 text-[11px]", ui.mut)}>No history yet.</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {history.slice(0, 12).map((h) => {
                            const isSel = h.id === activeId;
                            return (
                              <button
                                key={h.id}
                                type="button"
                                onClick={() => ensureCanvasSelection(h.id)}
                                style={toolVars(h.tool)}
                                className={cn(
                                  "w-full text-left rounded-3xl border px-3 py-2 transition active:scale-[0.99]",
                                  theme.border,
                                  isSel ? (darkMode ? "bg-white/[0.08]" : "bg-slate-900/[0.05]") : darkMode ? "bg-white/[0.03] hover:bg-white/[0.05]" : "bg-white/75 hover:bg-white",
                                  ringPremium(isSel)
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className={cn("text-[12px] font-semibold line-clamp-1", ui.soft)}>{h.title}</div>
                                  <div className={cn("text-[11px]", ui.mut)}>{formatTime(h.createdAt)}</div>
                                </div>

                                <div className="mt-1 flex items-center gap-2">
                                  <span className={cn("inline-flex items-center gap-2 px-2 py-[2px] rounded-xl border text-[10px] font-semibold", pillBadge(darkMode))}>
                                    {TOOL_META[h.tool].label}
                                  </span>
                                  {h.prompt && <div className={cn("text-[11px] line-clamp-1", ui.mut)}>{h.prompt}</div>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className={cn("mt-3 text-[11px]", ui.mut)}>Hover tool tabs: preview label only — the whole studio identity follows the selected tool.</div>
                  </div>
                </div>
              )}
            </SectionShell>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Small Fields
========================================================= */
function Select({
  label,
  value,
  onChange,
  options,
  ui,
  darkMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ui: { soft: string; input: string };
  darkMode: boolean;
}) {
  return (
    <div>
      <label className={cn("text-[12px] font-semibold", ui.soft)}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("mt-2 w-full h-11 rounded-3xl px-3 text-[13px] outline-none focus:ring-2 transition", ui.input)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className={darkMode ? "bg-[#0A0D18] text-white" : "bg-white text-slate-900"}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  setValue,
  min,
  max,
  step,
  ui,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  ui: { soft: string; input: string };
}) {
  const s = step ?? 1;
  return (
    <div>
      <label className={cn("text-[12px] font-semibold", ui.soft)}>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={s}
        onChange={(e) => setValue(Number(e.target.value))}
        className={cn("mt-2 w-full h-11 rounded-3xl px-3 text-[13px] outline-none focus:ring-2 transition", ui.input)}
      />
    </div>
  );
}  