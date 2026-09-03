"use client";

import React, {
  useEffect, useRef, useState,
  useCallback, useMemo,
} from "react";
import {
  Mic, Plus, Send, Loader2, X,
  AlertCircle, Image as ImageIcon,
  FileText, Smile, ChevronDown, Zap, Copy
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useVoice }        from "../../hooks/useVoice";
import { createSession }   from "../../lib/api/chat/sessions";
import { useUpload }       from "../../hooks/useUpload";
import { getStoredToken }  from "../../lib/api/core/qxtClient";
import hljs from "highlight.js";
import { FileCode2 } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { VoiceOrbOverlay } from "./VoiceOrbOverlay";


// ─── Types ────────────────────────────────────────────────────────────────────

type PendingImage = {
  url: string;
  preview: string;
  type: "image" | "video";
};

type PendingDocument = {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
};

type PendingCode = {
  code: string;
  language: string;
};

type Model = { id: string; label: string };

type VoiceMessage = {
  id?: string;
  text?: string;
  audioUrl?: string;
  role: "user" | "assistant";
  kind?: "audio" | "recording" | "audio_update" | "text" | "stream_update";
};

interface ChatFooterProps {
  input: string;
  loading: boolean;
  lang: "en" | "ar";
  darkMode: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onSend: (data: {
    text: string;
    model: string;
    isVoiceActive?: boolean;
    images?: string[];
    files?: PendingDocument[];
  }) => Promise<void> | void;
  pendingImages: PendingImage[];
  setPendingImages: React.Dispatch<React.SetStateAction<PendingImage[]>>;
  pendingDocuments?: PendingDocument[];
  setPendingDocuments?: React.Dispatch<React.SetStateAction<PendingDocument[]>>;
  onStop?: () => void;
  sessionId?: string | null;
  ensureSession?: () => Promise<string>;
  selectedModel?: Model | null;
  onModelChange?: (model: Model) => void;
  models?: Model[];
  onVoiceMessage?: (data: {
    id?: string;
    text?: string;
    audioUrl?: string;
    role: "user" | "assistant";
    kind?: "recording" | "text" | "audio" | "stream_update" | "audio_update";
  }) => void;
  onRecordingStateChange?: (recording: boolean) => void;
  onQuotaExceeded?: () => void;
  onSessionChange?: (id: string, session: any) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Ask Quark about anything...",
  "Get feedback on your ideas...",
  "Improve your productivity...",
  "Learn something new...",
  "Brainstorm your next project...",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const IconBtn = React.memo(({
  onClick, disabled, title, children, className = "",
}: {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      h-8 w-8 rounded-lg flex items-center justify-center
      transition-all duration-150
      disabled:opacity-40 disabled:cursor-not-allowed
      ${className}
    `}
  >
    {children}
  </button>
));
IconBtn.displayName = "IconBtn";

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChatFooter({
  input, loading, lang, darkMode, placeholder,
  onChange, onSend,
  pendingImages, setPendingImages,
  pendingDocuments = [], setPendingDocuments,
  onStop, sessionId,
  ensureSession,
  selectedModel, onModelChange, models = [],
  onVoiceMessage, onRecordingStateChange,
  onQuotaExceeded, onSessionChange,
}: ChatFooterProps) {

  const token = getStoredToken() || "";
  const { upload, progress: uploadProgress, uploading: isUploading } = useUpload(token);

  const [error, setError]               = useState<string | null>(null);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [emojiOpen, setEmojiOpen]       = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [mounted, setMounted]           = useState(false);

  const [pendingCode, setPendingCode] = useState<PendingCode | null>(null);
  const [codePreviewOpen, setCodePreviewOpen] = useState(false);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);
  const containerRef        = useRef<HTMLDivElement>(null);
  const placeholderTimer    = useRef<NodeJS.Timeout | null>(null);
  const recordingTimer      = useRef<NodeJS.Timeout | null>(null);
  const voiceIdRef          = useRef<string | null>(null);
  const voiceCanceledRef    = useRef(false);

  // ضيف الـ handler دا
const CODE_PASTE_LINE_THRESHOLD = 60; // lines

const looksLikeCode = (text: string): boolean => {
  const lines = text.split("\n");
  if (lines.length < CODE_PASTE_LINE_THRESHOLD) return false;
  const codeChars = (text.match(/[{}();=<>[\]]/g) || []).length;
  return codeChars / text.length > 0.02;
};

const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  const items = e.clipboardData?.items;

  // Image paste (existing behavior, unchanged)
  if (items) {
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const preview = URL.createObjectURL(file);
        const temp = { url: "", preview, type: "image" as const };
        setPendingImages((p) => [...p, temp]);

        upload(file).then((res) => {
          if (!res?.url) { setError("Upload failed"); return; }
          setPendingImages((p) =>
            p.map((img) => {
              if (img.preview === preview && !img.url) {
                URL.revokeObjectURL(preview);
                return { ...img, url: res.url, preview: res.url };
              }
              return img;
            })
          );
        });
        return;
      }
    }
  }

  const pastedText = e.clipboardData?.getData("text/plain") || "";
    if (looksLikeCode(pastedText)) {
    e.preventDefault();
    const detected = hljs.highlightAuto(pastedText);
    const language = detected.language || "plaintext";
    setPendingCode({ code: pastedText, language });
  }
}, [setPendingImages, upload]);


  // ── Voice hook ───────────────────────────────────────────────────────────────

const handleVoiceSessionCreated = useCallback((id: string) => {
    window.history.replaceState({}, "", `?sid=${id}`);
  }, []);

  const handleVoiceComplete = useCallback(() => {}, []);

  const handleVoiceMessageAction = useCallback((data: VoiceMessage) => {
    if (voiceCanceledRef.current || !onVoiceMessage) return;
    const baseId = voiceIdRef.current || data.id || `voice-${Date.now()}`;
    if (!voiceIdRef.current) voiceIdRef.current = baseId;

    if (data.role === "user") {
      onVoiceMessage({ id: baseId, role: "user", kind: (data.kind as any) || (data.text ? "text" : "stream_update"), text: data.text, audioUrl: data.audioUrl });
    } else {
      onVoiceMessage({ id: `assistant-${baseId}`, role: "assistant", kind: (data.kind as any) || (data.text ? "text" : "stream_update"), text: data.text, audioUrl: data.audioUrl });
    }
  }, [onVoiceMessage]);

  const [voiceStream, setVoiceStream] = useState<MediaStream | null>(null);
  const voiceState = useVoice({
    voiceMode: !!selectedModel,
    selectedModel: selectedModel ? { id: selectedModel.id } : undefined,
    sessionId: sessionId || undefined,
    onSessionCreatedAction: handleVoiceSessionCreated,
    onCompleteAction: handleVoiceComplete,
    onMessageAction: handleVoiceMessageAction,
    onStreamAction: setVoiceStream,
  });

  const {
    isRecording = false, isProcessing = false, isSpeaking = false,
    isPaused = false,
    voiceStage = null, voiceDetail = undefined,
    liveStatus = "", error: voiceError = null,
    startRecording = async () => {},
    interruptVoice = async () => {},
    pauseRecording = () => {},
    resumeRecording = () => {},
    stopSpeaking = () => {},
  } = voiceState || {};

  const isVoiceActive = isRecording || isProcessing;

  // ── Computed ─────────────────────────────────────────────────────────────────

  const currentModel = useMemo(() =>
    selectedModel || models[0] || null,
  [selectedModel, models]);

  const canSend = useMemo(() =>
    (input.trim().length > 0 || pendingImages.length > 0 || !!pendingCode) &&
    !loading && !isUploading && !!currentModel?.id && !isVoiceActive,
[input, pendingImages.length, pendingCode, loading, isUploading, currentModel?.id, isVoiceActive]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(recordingTime / 60);
    const s = recordingTime % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [recordingTime]);

  // ── Wave ─────────────────────────────────────────────────────────────────────

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // ✅ Old canvas-waveform mic visualization removed — it relied on
  // window.__onVoiceStreamReady, a global no one ever actually called
  // (the real mic stream flows through useVoice's onStreamAction to
  // VoiceOrbOverlay instead), so it never drew anything and just
  // opened an unused AudioContext on every recording. The orb now
  // owns all recording/processing/speaking visualization.

  useEffect(() => {
    if (sessionId || input.trim() || isVoiceActive) {
      setTypedPlaceholder("");
      if (placeholderTimer.current) clearTimeout(placeholderTimer.current);
      return;
    }

    const phrase = SUGGESTIONS[suggestionIdx];
    let i = 0;
    setTypedPlaceholder("");

    const t = setInterval(() => {
      if (i < phrase.length) {
        setTypedPlaceholder(phrase.slice(0, ++i));
      } else {
        clearInterval(t);
        placeholderTimer.current = setTimeout(() => {
          setSuggestionIdx((p) => (p + 1) % SUGGESTIONS.length);
        }, 3000);
      }
    }, 38);

    return () => clearInterval(t);
  }, [suggestionIdx, sessionId, input, isVoiceActive]);

  useEffect(() => {
    if (!isRecording) { setRecordingTime(0); return; }
    setRecordingTime(0);
    const t = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    recordingTimer.current = t as any;
    return () => clearInterval(t);
  }, [isRecording]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setEmojiOpen(false);
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { onRecordingStateChange?.(isVoiceActive); }, [isVoiceActive, onRecordingStateChange]);
  useEffect(() => { if (voiceError && !voiceError.includes("Audio")) setError(voiceError); }, [voiceError]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleVoiceToggle = useCallback(async () => {
    if (!isRecording) {
        voiceCanceledRef.current = false;

        // 🔥 FIX: tell the parent "voice is starting" BEFORE calling
        // ensureSession() — ensureSession() triggers a router.replace()
        // that changes the URL's sid param, which useChatHydration
        // watches and reacts to by reloading messages from the server
        // (wiping the just-added recording bubble). isVoiceActive
        // normally only becomes true once useVoice's own
        // isRecording/isProcessing flip — which happens AFTER
        // ensureSession() resolves — so the hydration guard wasn't
        // armed yet at the exact moment the URL changed. Signaling
        // early closes that gap.
        onRecordingStateChange?.(true);

        let sid: string;
        try {
            sid = await ensureSession!();
        } catch {
            setError("Failed to create session");
            onRecordingStateChange?.(false);
            return;
        }

        voiceIdRef.current = null;
        await startRecording(sid);
        return;
    }

    await startRecording();
}, [isRecording, startRecording, ensureSession, onRecordingStateChange]);

  const handleInterruptVoice = useCallback(async () => {
    const vid = voiceIdRef.current;
    onStop?.();
    voiceCanceledRef.current = true;
    voiceIdRef.current = null;

    if (vid) {
      onVoiceMessage?.({ id: vid,              role: "user",      kind: "stream_update", text: "__VOICE_CANCEL__" });
      onVoiceMessage?.({ id: `assistant-${vid}`, role: "assistant", kind: "stream_update", text: "__VOICE_CANCEL__" });
    }

    try { await interruptVoice(); } catch {}
  }, [interruptVoice, onVoiceMessage, onStop]);

const handleSend = useCallback(async () => {
    if (!canSend) return;

    try {
      setError(null);

      // 🔥 If there's a pending code attachment, fold it into the
      // message text as a fenced code block — the same format model
      // replies already use, so the existing CodeBlock/artifact
      // detection in ChatMessages picks it up automatically.
      const codeBlock = pendingCode
        ? `\n\n\`\`\`${pendingCode.language}\n${pendingCode.code}\n\`\`\``
        : "";

      await onSend({
        text:   input.trim() + codeBlock,
        model:  currentModel!.id,
        isVoiceActive: false,
        images: pendingImages.filter((i) => i.url).map((i) => i.url),
        files:  pendingDocuments.filter((f) => f.url),
      });
      onChange("");
      setPendingImages([]);
      setPendingDocuments?.([]);
      setPendingCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    }
}, [canSend, input, currentModel, pendingImages, pendingDocuments, pendingCode, onSend, onChange, setPendingImages, setPendingDocuments]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (!loading && !isVoiceActive && canSend) handleSend();
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      const ta  = e.currentTarget;
      const pos = ta.selectionStart;
      onChange(input.slice(0, pos) + "\n" + input.slice(ta.selectionEnd));
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + 1; }, 0);
    }
  }, [loading, isVoiceActive, canSend, handleSend, input, onChange]);

  const handleFileSelect = useCallback((type: "image" | "file") => {
    const el   = document.createElement("input");
    el.type    = "file";
    el.accept  = type === "image" ? "image/*,video/*" : "*";

    el.onchange = async (ev: any) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      setMenuOpen(false);

      const preview = URL.createObjectURL(file);

      if (file.type.startsWith("image") || file.type.startsWith("video")) {
        const temp = { url: "", preview, type: file.type.startsWith("video") ? "video" as const : "image" as const };
        setPendingImages((p) => [...p, temp]);

        const res = await upload(file);
        if (!res?.url) { setError("Upload failed"); return; }

        setPendingImages((p) =>
          p.map((img) => {
            if (img.preview === preview && !img.url) {
              URL.revokeObjectURL(preview);
              return { ...img, url: res.url, preview: res.url };
            }
            return img;
          })
        );
      } else {
        const temp = { url: "", name: file.name, size: file.size, mimeType: file.type };
        setPendingDocuments?.((p) => [...(p || []), temp]);

        const res = await upload(file);
        if (!res?.url) { setError("Upload failed"); return; }

        setPendingDocuments?.((p) =>
          (p || []).map((d) => d.name === file.name && !d.url ? { ...d, url: res.url } : d)
        );
      }
    };

    el.click();
  }, [setPendingImages, setPendingDocuments, upload]);

  const handleRemoveImage = useCallback((idx: number) => {
    setPendingImages((p) => {
      const item = p[idx];
      if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      return p.filter((_, i) => i !== idx);
    });
  }, [setPendingImages]);

  const handleRemoveDoc = useCallback((idx: number) => {
    setPendingDocuments?.((p) => (p || []).filter((_, i) => i !== idx));
  }, [setPendingDocuments]);

  const handleRemoveCode = useCallback(() => {
  setPendingCode(null);
}, []);

  const handleEmoji = useCallback((obj: any) => {
    const ta  = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    onChange(input.slice(0, pos) + obj.emoji + input.slice(ta.selectionEnd));
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + obj.emoji.length; }, 0);
  }, [input, onChange]);

  // ── Styles ────────────────────────────────────────────────────────────────────

  const dim = darkMode
    ? "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
    : "text-black/40 hover:text-black/70 hover:bg-black/[0.06]";

  const menuClass = darkMode
    ? "bg-[#0d1117] border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    : "bg-white border-black/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.12)]";

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">

      {/* ── Error toast ── */}
      {error && (
        <div className="mb-2 animate-in slide-in-from-top fade-in duration-200">
          <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm ${
            darkMode
              ? "bg-red-950/50 border-red-900/50 text-red-300"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ✅ Recording/Processing bars removed — the VoiceOrbOverlay
          (fixed, center-screen orb) now shows this state instead,
          replacing the old canvas waveform + "🧠 Transcribing..." bar
          that used to sit here above the composer. */}

      {/* ── Pending attachments ── */}
      {(pendingImages.length > 0 || pendingDocuments.length > 0) && (
        <div className={`mb-2 flex flex-wrap gap-2 p-2.5 rounded-xl border ${
          darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-black/[0.02] border-black/[0.06]"
        }`}>
          {pendingImages.map((m, i) => (
            <div key={i} className="relative group w-14 h-14 rounded-lg overflow-hidden shrink-0">
              <img src={m.preview} alt="" className="w-full h-full object-cover" />
              {!m.url && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                </div>
              )}
              <button
                onClick={() => handleRemoveImage(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}

          {pendingDocuments.map((d, i) => (
            <div key={i} className={`relative group flex items-center gap-2 pl-2.5 pr-7 py-2 rounded-lg border text-xs ${
              darkMode ? "bg-white/[0.04] border-white/[0.08] text-white/60" : "bg-black/[0.03] border-black/[0.08] text-black/60"
            }`}>
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="max-w-[80px] truncate">{d.name}</span>
              {!d.url && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
              <button
                onClick={() => handleRemoveDoc(i)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Pending code attachment ── */}
      {pendingCode && (
        <div className="mb-2">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setCodePreviewOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setCodePreviewOpen(true);
            }}
            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-blue-500/25 bg-gradient-to-br from-zinc-900/60 to-black/40 hover:border-blue-400/50 transition-colors w-full max-w-xs text-left cursor-pointer"
          >
            <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <FileCode2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-zinc-100 truncate">
                {pendingCode.language || "code"} snippet
              </div>
              <div className="text-[11px] text-zinc-400">
                {pendingCode.code.split("\n").length} lines
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemoveCode(); }}
              className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Remove code"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main input box ── */}
      <div className={`rounded-2xl border transition-all duration-200 ${
  darkMode
    ? "bg-white/[0.04] border-white/[0.06] focus-within:border-blue-500/40 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
    : "bg-black/[0.03] border-black/[0.06] focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.12)]"
}`}>

        {/* Textarea */}
        <div className="px-4 pt-3.5 pb-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={sessionId ? "Message..." : (typedPlaceholder || placeholder || "Message...")}
            disabled={loading || isVoiceActive}
            className={`w-full resize-none bg-transparent text-sm leading-relaxed qxt-scroll
outline-none ring-0 border-0 appearance-none
focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none
placeholder:transition-opacity
disabled:opacity-50
${darkMode ? "text-white placeholder:text-white/25" : "text-black placeholder:text-black/30"}
`}
          />
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="px-4 pb-2">
            <div className={`h-0.5 rounded-full overflow-hidden ${darkMode ? "bg-white/10" : "bg-black/10"}`}>
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className={`text-[11px] mt-1 block ${darkMode ? "text-white/30" : "text-black/30"}`}>
              Uploading {Math.round(uploadProgress)}%
            </span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 pb-3">

          {/* ── Model selector ── */}
            <ModelSelector darkMode={darkMode} />

          {/* Divider */}
          <div className={`w-px h-4 mx-1 ${darkMode ? "bg-white/[0.08]" : "bg-black/[0.08]"}`} />

          {/* ── Emoji ── */}
          <div className="relative">
            <IconBtn
              onClick={() => setEmojiOpen((v) => !v)}
              disabled={isVoiceActive}
              title="Emoji"
              className={dim}
            >
              <Smile className="w-4 h-4" />
            </IconBtn>

            {emojiOpen && (
              <div className="absolute bottom-full right-0 mb-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-150">
                <EmojiPicker
                  onEmojiClick={handleEmoji}
                  height={340}
                  width={290}
                  searchDisabled
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>

          {/* ── Attach ── */}
          <div className="relative">
            <IconBtn
              onClick={() => setMenuOpen((v) => !v)}
              disabled={isVoiceActive}
              title="Attach"
              className={dim}
            >
              <Plus className="w-4 h-4" />
            </IconBtn>

            {menuOpen && (
              <div className={`
                absolute bottom-full right-0 mb-2 w-44
                rounded-xl border overflow-hidden
                animate-in slide-in-from-bottom-2 fade-in duration-150
                z-50 ${menuClass}
              `}>
                {[
                  { label: "Image & video", icon: ImageIcon, type: "image" as const },
                  { label: "File",          icon: FileText,  type: "file"  as const },
                ].map(({ label, icon: Icon, type }) => (
                  <button
                    key={type}
                    onClick={() => handleFileSelect(type)}
                    disabled={isUploading || isVoiceActive}
                    className={`
                      w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm
                      transition-colors duration-100 disabled:opacity-40
                      ${darkMode
                        ? "text-white/60 hover:bg-white/[0.05] hover:text-white/85"
                        : "text-black/60 hover:bg-black/[0.04] hover:text-black/85"
                      }
                      ${type === "image" ? `border-b ${darkMode ? "border-white/[0.06]" : "border-black/[0.06]"}` : ""}
                    `}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ── Voice / Send ── */}
          {!isRecording ? (
            <div className="flex items-center gap-1.5">
              {/* Mic */}
              <IconBtn
                onClick={handleVoiceToggle}
                disabled={loading || isProcessing}
                title={isProcessing ? "Processing..." : "Voice"}
                className={isProcessing
                  ? darkMode ? "text-blue-400 bg-blue-500/10" : "text-blue-600 bg-blue-500/10"
                  : dim
                }
              >
                {isProcessing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Mic className="w-4 h-4" />
                }
              </IconBtn>

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`
                  h-8 w-8 rounded-lg flex items-center justify-center
                  transition-all duration-150
                  ${canSend
                    ? "bg-white text-black hover:bg-white/90"
                    : darkMode
                      ? "bg-white/[0.06] text-white/25 cursor-not-allowed"
                      : "bg-black/[0.06] text-black/25 cursor-not-allowed"
                  }
                `}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Cancel */}
              <IconBtn
                onClick={handleInterruptVoice}
                title="Cancel"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
              </IconBtn>

              {/* 🔥 FIX: Mic button stays visible during recording too —
                  clicking it now stops the recording and sends it, the
                  same action the user's muscle memory expects ("tap
                  mic again to stop"). Previously the mic button
                  vanished entirely while recording and was replaced
                  only by a separate Send icon elsewhere, which is why
                  taps kept landing nowhere and stacking up duplicate
                  "Recording..." bubbles instead of ever stopping the
                  in-progress one. */}
              <IconBtn
                onClick={handleVoiceToggle}
                title="Stop & Send"
                className="text-red-400 bg-red-500/10 animate-pulse"
              >
                <Mic className="w-4 h-4" />
              </IconBtn>
            </div>
          )}
        </div>
      </div>

      {/* ── Hint ── */}
      {!loading && !isVoiceActive && (
        <p className={`mt-2 text-[11px] px-1 ${darkMode ? "text-white/20" : "text-black/25"}`}>
          {"Shift + Enter for new line"}
        </p>
      )}

      {/* ── Code preview modal ── */}
      {codePreviewOpen && pendingCode && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-6"
          onClick={() => setCodePreviewOpen(false)}
        >
          <div
            className="bg-[#0a0a0b] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <FileCode2 className="w-4 h-4 text-blue-400" />
                <span className="uppercase text-blue-400/80 text-xs tracking-wide">{pendingCode.language}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigator.clipboard.writeText(pendingCode.code)}
                  className="h-7 px-2.5 rounded-md bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-1.5 border border-blue-500/40"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
                <button
                  onClick={() => setCodePreviewOpen(false)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <pre className="p-4 text-[13px] text-zinc-100 font-mono overflow-auto flex-1 whitespace-pre qxt-scroll">
              {pendingCode.code}
            </pre>
          </div>
        </div>
      )}

      <VoiceOrbOverlay
        isRecording={isRecording}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        voiceStage={voiceStage}
        voiceDetail={voiceDetail}
        stream={voiceStream}
        onCancel={handleInterruptVoice}
        onSend={handleVoiceToggle}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onStopSpeaking={stopSpeaking}
      />
    </div>
  );
}