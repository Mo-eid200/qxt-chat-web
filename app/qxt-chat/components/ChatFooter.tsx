"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Mic,
  Plus,
  Send,
  Loader2,
  X,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Smile,
  ChevronDown,
  Zap,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useVoice } from "../../hooks/useVoice";
import { createSession } from "../../lib/api/chat/sessions";
import { useUpload } from "../../hooks/useUpload";
import { getStoredToken } from "../../lib/api/core/qxtClient";

// ========================
// TYPES
// ========================

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

type Model = {
  id: string;
  label: string;
};

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
  onStop?: () => void; // ✅ stopRequest from parent (kills pendingStage/streaming/loading)
  sessionId?: string | null;
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

// ========================
// CONSTANTS
// ========================

const PLACEHOLDER_SUGGESTIONS = [
  "Ask Quarc about anything...",
  "Get feedback on your ideas...",
  "Improve your productivity...",
  "Learn something new...",
  "Brainstorm your next project...",
  "Get creative inspiration...",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ========================
// MAIN COMPONENT
// ========================

export function ChatFooter({
  input,
  loading,
  lang,
  darkMode,
  placeholder,
  onChange,
  onSend,
  pendingImages,
  setPendingImages,
  pendingDocuments = [],
  setPendingDocuments,
  onStop,
  sessionId,
  selectedModel,
  onModelChange,
  models = [],
  onVoiceMessage,
  onRecordingStateChange,
  onQuotaExceeded,
  onSessionChange,
}: ChatFooterProps) {
  // ========================
  // STATE
  // ========================

  const token = getStoredToken() || "";
  const [error, setError] = useState<string | null>(null);
  const { upload, cancel: cancelUpload, progress: uploadProgress, uploading: isUploading } = useUpload(token);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

  // Audio visualization
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Voice tracking
  const currentVoiceIdRef = useRef<string | null>(null);
  const voiceCanceledRef = useRef(false); // ✅ gate late events after cancel

  // ========================
  // REFS
  // ========================

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ========================
  // LANGUAGE & DIRECTION
  // ========================

  const isArabic = lang === "ar";
  const textDirection = isArabic ? "rtl" : "ltr";

  // ========================
  // VOICE HOOK
  // ========================

  const voiceState = useVoice({
    voiceMode: !!(sessionId || selectedModel),
    selectedModel: selectedModel ? { id: selectedModel.id } : undefined,
    sessionId: sessionId || undefined,

    onSessionCreatedAction: (id: string) => {
      console.log("[ChatFooter] 📋 Session created callback:", id);
      window.history.replaceState({}, "", `?sid=${id}`);
    },

    onCompleteAction: () => {
      console.log("[ChatFooter] ✅ Voice action complete");
    },

    // Pass-through
    onMessageAction: (data: VoiceMessage) => {
      // ✅ Ignore any late events after cancel (prevents wrong ordering / phantom bubbles)
      if (voiceCanceledRef.current) return;

      if (!onVoiceMessage) return;

      const baseId = currentVoiceIdRef.current || data.id || `voice-${Date.now()}`;
      if (!currentVoiceIdRef.current) currentVoiceIdRef.current = baseId;

      if (data.role === "user") {
        onVoiceMessage({
          id: baseId,
          role: "user",
          kind: (data.kind as any) || (data.text ? "text" : "stream_update"),
          text: data.text,
          audioUrl: data.audioUrl,
        });
        return;
      }

      onVoiceMessage({
        id: `assistant-${baseId}`,
        role: "assistant",
        kind: (data.kind as any) || (data.text ? "text" : "stream_update"),
        text: data.text,
        audioUrl: data.audioUrl,
      });
    },
  });

  const {
    isRecording = false,
    isProcessing = false,
    liveStatus = "",
    error: voiceError = null,
    startRecording = async () => { },
    interruptVoice = async () => { },
  } = voiceState || {};

  const isVoiceActive = isRecording || isProcessing;

  // ========================
  // WAVE DRAWING FUNCTION
  // ========================

  const drawWave = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ef4444";

    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    if (isRecording) animationRef.current = requestAnimationFrame(drawWave);
  }, [isRecording]);

  // ========================
  // COMPUTED VALUES
  // ========================

  const availableModels = useMemo(() => models || [], [models]);
  const currentModel = useMemo(() => {
    if (selectedModel) return selectedModel;

    // fallback
    if (models.length > 0) return models[0];

    return null;
  }, [selectedModel, models]);

  const canSendMessage = useMemo(
    () =>
      (input.trim().length > 0 || pendingImages.length > 0) &&
      !loading &&
      !isUploading &&
      !!currentModel?.id &&
      !isVoiceActive,
    [input, pendingImages.length, loading, isUploading, currentModel?.id, isVoiceActive]
  );

  const shouldDisableInput = useMemo(
    () => loading || isVoiceActive || isProcessing,
    [loading, isVoiceActive, isProcessing]
  );

  const sendButtonStyles = useMemo(() => {
    if (!canSendMessage) {
      return darkMode
        ? "bg-gray-700/50 text-gray-500 cursor-not-allowed opacity-50"
        : "bg-gray-300/50 text-gray-500 cursor-not-allowed opacity-50";
    }
    return "bg-green-600/80 hover:bg-green-600 text-white transition-colors";
  }, [canSendMessage, darkMode]);

  const bgInput = useMemo(
    () =>
      darkMode
        ? "bg-gray-700/60 hover:bg-gray-600/80 text-gray-300 hover:text-gray-100"
        : "bg-gray-200/60 hover:bg-gray-300/80 text-gray-700 hover:text-gray-900",
    [darkMode]
  );

  const bgGlassomorphic = useMemo(
    () => (darkMode ? "bg-gray-900/95 border-gray-700/60" : "bg-white/95 border-gray-300/60"),
    [darkMode]
  );

  const buttonHoverStyles = useMemo(
    () => `h-8 w-8 rounded-lg flex items-center justify-center transition-all ${bgInput}`,
    [bgInput]
  );

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [recordingTime]);

  // ========================
  // EFFECTS
  // ========================


  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  }, [input]);

  useEffect(() => {
    if (!isRecording) return;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }

    (window as any).__onVoiceStreamReady = (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 1024;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        drawWave();
      } catch (err) {
        console.error("[ChatFooter] ❌ Audio context error:", err);
      }
    };

    return () => {
      (window as any).__onVoiceStreamReady = null;

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, [isRecording, drawWave]);

  useEffect(() => {
    if (sessionId || input.trim().length > 0 || isVoiceActive) {
      setTypedPlaceholder("");
      if (placeholderTimerRef.current) clearTimeout(placeholderTimerRef.current);
      return;
    }

    const phrase = PLACEHOLDER_SUGGESTIONS[currentPlaceholderIndex];
    let charIndex = 0;
    setTypedPlaceholder("");

    const typingInterval = setInterval(() => {
      if (charIndex < phrase.length) {
        setTypedPlaceholder(phrase.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        placeholderTimerRef.current = setTimeout(() => {
          setCurrentPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length);
        }, 3000);
      }
    }, 40);

    return () => clearInterval(typingInterval);
  }, [currentPlaceholderIndex, sessionId, input, isVoiceActive]);

  useEffect(() => {
    if (!isRecording) {
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      setRecordingTime(0);
      return;
    }

    setRecordingTime(0);
    const timer = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    recordingTimerRef.current = timer as any;

    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setEmojiOpen(false);
        setModelMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    onRecordingStateChange?.(isVoiceActive);
  }, [isVoiceActive, onRecordingStateChange]);

  useEffect(() => {
    if (voiceError && !voiceError.includes("Audio")) setError(voiceError);
  }, [voiceError]);

  // ========================
  // HANDLERS
  // ========================

  const handleVoiceToggle = useCallback(async () => {
    let sid = sessionId;

    if (!isRecording) {
      // ✅ starting recording: allow voice events
      voiceCanceledRef.current = false;

      const tempId = `voice-${Date.now()}`;
      currentVoiceIdRef.current = tempId;

      // show recording bubble immediately
      onVoiceMessage?.({
        id: tempId,
        role: "user",
        text: "",
        kind: "recording",
      });

      if (!sid) {
        try {
          const res = await createSession();
          sid = res.id;
          onSessionChange?.(sid, res);
          window.history.replaceState({}, "", `?sid=${sid}`);
        } catch (err) {
          setError("Failed to create session");
          currentVoiceIdRef.current = null;
          return;
        }
      }

      await startRecording();
      return;
    }

    // submit recording
    await startRecording();
  }, [sessionId, isRecording, startRecording, onSessionChange, onVoiceMessage]);

  /**
   * ✅ Cancel behavior (GPT-like):
   * - remove user recording bubble + assistant temp bubble
   * - stop system status immediately (pendingStage/streaming/loading)
   * - ignore any late voice events after cancel (so no weird ordering)
   */
  const handleInterruptVoice = useCallback(async () => {
    const vid = currentVoiceIdRef.current;

    // 1) stop parent "system status" immediately
    onStop?.();

    // 2) gate late events immediately
    voiceCanceledRef.current = true;
    currentVoiceIdRef.current = null;

    // 3) remove temp bubbles in UI
    if (vid) {
      onVoiceMessage?.({ id: vid, role: "user", kind: "stream_update", text: "__VOICE_CANCEL__" });
      onVoiceMessage?.({
        id: `assistant-${vid}`,
        role: "assistant",
        kind: "stream_update",
        text: "__VOICE_CANCEL__",
      });
    }

    // 4) stop recorder in background
    try {
      await interruptVoice();
    } catch {
      // ignore
    }
  }, [interruptVoice, onVoiceMessage, onStop]);

  const handleSend = useCallback(async () => {
    if (isVoiceActive) {
      setError("Stop recording first");
      return;
    }

    if (!canSendMessage) {
      if (!input.trim() && pendingImages.length === 0) setError("Type a message or attach media");
      return;
    }

    try {
      setError(null);

      if (!currentModel?.id) {
        setError("No model available");
        return;
      }

      await onSend({
        text: input.trim(),
        model: currentModel!.id,
        isVoiceActive: false,
        images: pendingImages.filter(img => img.url).map(img => img.url),
        files: pendingDocuments.filter(f => f.url),
      });
      onChange("");
      setPendingImages([]);
      setPendingDocuments?.([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
    }
  }, [isVoiceActive, canSendMessage, input, pendingImages.length, currentModel, onSend, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (!loading && !isVoiceActive && canSendMessage) handleSend();
      }

      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const newValue = input.substring(0, start) + "\n" + input.substring(end);
        onChange(newValue);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    },
    [loading, isVoiceActive, canSendMessage, handleSend, input, onChange]
  );

  const handleFileSelect = useCallback(
    (type: "image" | "file") => {
      const inputEl = document.createElement("input");
      inputEl.type = "file";
      inputEl.accept = type === "image" ? "image/*,video/*" : "*";

      inputEl.onchange = async (event: any) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setMenuOpen(false);

        const localPreview = URL.createObjectURL(file);

        // ✅ show preview instantly
        if (file.type.startsWith("image") || file.type.startsWith("video")) {
          const tempItem = {
            url: "", // لسه مفيش URL
            preview: localPreview,
            type: file.type.startsWith("video") ? "video" as const : "image" as const,
          };

          setPendingImages((prev) => [...prev, tempItem]);

          // upload في الخلفية
          const res = await upload(file);

          if (!res?.url) {
            setError("Upload failed");
            return;
          }

          // ✅ replace temp item بالـ URL الحقيقي
          setPendingImages((prev) =>
            prev.map((img) => {
              if (img.preview === localPreview && !img.url) {
                // ✅ امسح الـ blob
                URL.revokeObjectURL(localPreview);

                return {
                  ...img,
                  url: res.url,
                  preview: res.url, // ✅ أهم سطر
                };
              }
              return img;
            })
          );
        } else {
          // documents
          const tempDoc = {
            url: "",
            name: file.name,
            size: file.size,
            mimeType: file.type,
          };

          setPendingDocuments?.((prev) => [...(prev || []), tempDoc]);

          const res = await upload(file);

          if (!res?.url) {
            setError("Upload failed");
            return;
          }

          setPendingDocuments?.((prev) =>
            (prev || []).map((doc) =>
              doc.name === file.name && !doc.url
                ? { ...doc, url: res.url }
                : doc
            )
          );
        }
      };

      inputEl.click();
    },
    [setPendingImages, setPendingDocuments, upload, setMenuOpen, setError]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      setPendingImages((prev) => {
        const item = prev[index];

        if (item?.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }

        return prev.filter((_, i) => i !== index);
      });

    },
    [setPendingImages]
  );

  const handleRemoveDocument = useCallback(
    (index: number) => {
      setPendingDocuments?.((prev) => (prev || []).filter((_, i) => i !== index));
    },
    [setPendingDocuments]
  );

  const handleInsertEmoji = useCallback(
    (emojiObject: any) => {
      const emoji = emojiObject.emoji;
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = input.substring(0, start) + emoji + input.substring(end);

      onChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      }, 0);
    },
    [input, onChange]
  );

  // ========================
  // RENDER
  // ========================

  return (
    <div ref={containerRef} className="relative transition-colors duration-300" dir={textDirection}>
      <div className="backdrop-blur-md bg-gradient-to-t from-black/5 to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">
          {error && (
            <div className="animate-in slide-in-from-top fade-in duration-300">
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${darkMode ? "bg-red-950/40 border-red-900/60" : "bg-red-50/80 border-red-200/60"
                  }`}
              >
                <AlertCircle
                  className={`w-5 h-5 flex-shrink-0 ${darkMode ? "text-red-400" : "text-red-600"}`}
                />
                <p className={`flex-1 text-sm ${darkMode ? "text-red-300" : "text-red-700"}`}>
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  className={`flex-shrink-0 p-1 rounded-lg transition-colors ${darkMode ? "hover:bg-red-900/40" : "hover:bg-red-200/40"
                    }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-500/10 border-red-500/30 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono text-red-500 min-w-[40px]">{formattedTime}</span>
              <canvas ref={canvasRef} width={140} height={28} className="flex-1 max-w-[140px]" />
            </div>
          )}

          {isProcessing && !isRecording && (
            <div className="animate-in slide-in-from-top fade-in duration-300">
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${darkMode
                  ? "bg-blue-950/40 border-blue-900/60"
                  : "bg-blue-50/80 border-blue-200/60"
                  }`}
              >
                <Loader2 className={`w-5 h-5 animate-spin ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                <p className={`flex-1 text-sm font-medium ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
                  {liveStatus || (isArabic ? "🔄 جاري معالجة الصوت..." : "🔄 Processing voice...")}
                </p>
              </div>
            </div>
          )}

          {(pendingImages.length > 0 || pendingDocuments.length > 0) && (
            <div className="animate-in slide-in-from-bottom fade-in duration-300">
              <div
                className={`flex flex-wrap gap-2 p-3 rounded-xl border ${darkMode ? "bg-gray-800/60 border-gray-700/60" : "bg-gray-100/60 border-gray-300/60"
                  }`}
              >
                {pendingImages.map((media, index) => (
                  <div key={`media-${index}`} className="relative group">
                    <div
                      className={`relative h-16 w-16 rounded-lg overflow-hidden border ${darkMode ? "border-gray-600/60 bg-gray-700/40" : "border-gray-300/60 bg-gray-200/40"
                        }`}
                    >
                      <img
                        src={media.preview}
                        alt={`media-${index}`}
                        className="w-full h-full object-cover"
                      />
                      {media.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="w-5 h-5 rounded-full border-2 border-white" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}

                {pendingDocuments.map((doc, index) => (
                  <div key={`doc-${index}`} className="relative group">
                    <div
                      className={`relative h-16 w-16 rounded-lg overflow-hidden border flex items-center justify-center ${darkMode ? "border-gray-600/60 bg-gray-700/40" : "border-gray-300/60 bg-gray-200/40"
                        }`}
                    >
                      <FileText className={`w-6 h-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`} />
                    </div>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/90 rounded-md text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {doc.name.length > 12 ? `${doc.name.slice(0, 12)}...` : doc.name}
                    </div>
                    <button
                      onClick={() => handleRemoveDocument(index)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={`flex items-end gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 ${darkMode
              ? "bg-white/5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              : "bg-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
              }`}
          >
            {/* Model Selector */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${bgInput}`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline max-w-[80px] truncate">{currentModel?.label || "Model"}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${modelMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {modelMenuOpen && availableModels.length > 0 && (
                <div
                  className={`absolute bottom-full mb-2 left-0 w-56 rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-bottom fade-in duration-200 z-50 overflow-hidden ${bgGlassomorphic}`}
                >
                  <div className="flex flex-col py-1">
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange?.(model);
                          setModelMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${currentModel?.id === model.id
                          ? darkMode
                            ? "bg-gray-700/60 text-gray-100"
                            : "bg-gray-200/60 text-gray-900"
                          : darkMode
                            ? "hover:bg-gray-800/40 text-gray-400"
                            : "hover:bg-gray-100/40 text-gray-600"
                          }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span className="font-medium">{model.label}</span>
                        {currentModel?.id === model.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`w-px h-6 ${darkMode ? "bg-gray-700/40" : "bg-gray-300/40"}`} />

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={sessionId ? "Message..." : typedPlaceholder || "Message..."}
              disabled={shouldDisableInput}
              className={`flex-1 resize-none outline-none border-0 text-sm bg-transparent disabled:opacity-50 focus:outline-none focus:ring-0 ${darkMode ? "text-gray-100" : "text-gray-900"
                }`}
            />
            {isUploading && (
              <div className="text-xs px-4 text-emerald-300/80">
                Uploading... {Math.round(uploadProgress)}%
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!isRecording ? (
                <>
                  <button
                    onClick={handleVoiceToggle}
                    disabled={loading || isProcessing}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all font-medium ${isProcessing
                      ? darkMode
                        ? "bg-blue-600/40 text-blue-300"
                        : "bg-blue-100/80 text-blue-600"
                      : bgInput
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isProcessing ? "Processing voice..." : "Start recording"}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setEmojiOpen(!emojiOpen)}
                      disabled={isVoiceActive}
                      className={`${buttonHoverStyles} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {emojiOpen && (
                      <div className="absolute bottom-full right-0 mb-3 z-50 animate-in slide-in-from-bottom fade-in duration-200">
                        <EmojiPicker
                          onEmojiClick={handleInsertEmoji}
                          height={350}
                          width={300}
                          searchDisabled
                          skinTonesDisabled
                          previewConfig={{ showPreview: false }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      disabled={isVoiceActive}
                      className={`${buttonHoverStyles} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {menuOpen && (
                      <div
                        className={`absolute bottom-full right-0 mb-3 rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-bottom fade-in duration-200 z-50 overflow-hidden ${bgGlassomorphic}`}
                      >
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleFileSelect("image")}
                            disabled={isUploading || isVoiceActive}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm border-b ${darkMode
                              ? "hover:bg-gray-800/40 border-gray-700/40 text-gray-300"
                              : "hover:bg-gray-100/40 border-gray-300/40 text-gray-700"
                              }`}
                          >
                            <ImageIcon className="w-4 h-4" />
                            Image & video
                          </button>

                          <button
                            onClick={() => handleFileSelect("file")}
                            disabled={isUploading || isVoiceActive}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm ${darkMode ? "hover:bg-gray-800/40 text-gray-300" : "hover:bg-gray-100/40 text-gray-700"
                              }`}
                          >
                            <FileText className="w-4 h-4" />
                            Files
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={!canSendMessage}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all font-medium ${sendButtonStyles}`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleInterruptVoice}
                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                    title="Cancel recording"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleVoiceToggle}
                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-green-600/80 hover:bg-green-600 text-white transition-colors"
                    title="Submit recording"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {!loading && !isVoiceActive && (
            <p className={`text-xs px-4 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
              {isArabic ? "اضغط Shift + Enter للسطر الجديد" : "Shift + Enter for new line"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}