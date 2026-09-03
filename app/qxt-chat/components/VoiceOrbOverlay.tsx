"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play, Send, X, Square } from "lucide-react";

type OrbState = "listening" | "processing" | "speaking";

type Props = {
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  voiceStage?: string | null;
  voiceDetail?: string;
  stream: MediaStream | null;
  onCancel: () => void;
  onSend: () => void;
  onPause: () => void;
  onResume: () => void;
  onStopSpeaking: () => void;
};

// ✅ Fallback labels for stages the backend may send that don't have
// rich detail text (or before the first status event arrives).
const STAGE_LABEL: Record<string, string> = {
  thinking: "Thinking",
  searching: "Searching",
  analyzing: "Analyzing",
  generating: "Generating",
  writing: "Writing",
};

const THEME: Record<OrbState, { from: string; to: string; ring: string; glow: string }> = {
  listening: { from: "#818cf8", to: "#6366f1", ring: "rgba(129,140,248,0.35)", glow: "rgba(99,102,241,0.45)" },
  processing: { from: "#818cf8", to: "#6366f1", ring: "rgba(129,140,248,0.25)", glow: "rgba(99,102,241,0.35)" },
  speaking: { from: "#34d399", to: "#10b981", ring: "rgba(52,211,153,0.35)", glow: "rgba(16,185,129,0.45)" },
};

// ✅ Glass-morphism pill control — matches the orb's modern aesthetic
// instead of dropping plain icon buttons next to it.
function GlassButton({
  onClick,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex items-center justify-center rounded-full transition-all duration-150 active:scale-90"
      style={{
        width: 44,
        height: 44,
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: danger ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.85)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(248,113,113,0.18)"
          : "rgba(255,255,255,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.10)";
      }}
    >
      {children}
    </button>
  );
}

export function VoiceOrbOverlay({
  isRecording,
  isProcessing,
  isSpeaking,
  isPaused,
  voiceStage,
  voiceDetail,
  stream,
  onCancel,
  onSend,
  onPause,
  onResume,
  onStopSpeaking,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [level, setLevel] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const active = isRecording || isProcessing || isSpeaking;
  const state: OrbState = isSpeaking ? "speaking" : isProcessing ? "processing" : "listening";
  const theme = THEME[state];

  useEffect(() => {
    if (active) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [active]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    setLevel(Math.min(1, avg / 100));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!stream || !isRecording || isPaused) {
      setLevel(0);
      return;
    }
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      audioCtxRef.current = ac;
      analyserRef.current = analyser;
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Non-fatal — orb still shows without the live pulse
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      setLevel(0);
    };
  }, [stream, isRecording, isPaused, tick]);

  const [idlePulse, setIdlePulse] = useState(0);
  useEffect(() => {
    if (isRecording && !isPaused) return;
    let raf: number;
    const start = performance.now();
    const loop = (t: number) => {
      const elapsed = (t - start) / 1000;
      setIdlePulse((Math.sin(elapsed * 2.4) + 1) / 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isRecording, isPaused, state]);

  if (!mounted) return null;

  const ringLevel = isRecording && !isPaused ? level : isPaused ? 0 : idlePulse;
  const ringScale = 1 + ringLevel * 0.35;
  const isSpinning = state === "processing";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8"
      style={{
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background: "rgba(0,0,0,0.35)",
        opacity: active ? 1 : 0,
        transition: "opacity 260ms ease",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {/* Status hint */}
      <div
        className="text-white/70 text-sm font-medium tracking-wide"
        style={{ opacity: active ? 1 : 0, transition: "opacity 300ms ease 100ms" }}
      >
        {state === "listening" && (isPaused ? "Paused" : "Listening...")}
        {state === "processing" && (
          voiceStage && STAGE_LABEL[voiceStage]
            ? `${STAGE_LABEL[voiceStage]}${voiceDetail ? ` — "${voiceDetail}"` : ""}`
            : "Thinking..."
        )}
        {state === "speaking" && "Speaking..."}
      </div>

      {/* Orb */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 160,
          height: 160,
          transform: `scale(${active ? 1 : 0.85})`,
          transition: "transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 140,
            height: 140,
            background: theme.ring,
            transform: `scale(${ringScale})`,
            transition: isRecording && !isPaused ? "transform 80ms linear" : "transform 400ms ease",
            filter: "blur(2px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
          }}
        />
        <div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: 96,
            height: 96,
            background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
            boxShadow: `0 0 30px ${theme.glow}`,
            transition: "background 400ms ease",
            opacity: isPaused ? 0.55 : 1,
          }}
        >
          {isSpinning && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "2.5px solid transparent",
                borderTopColor: "rgba(255,255,255,0.85)",
                borderRightColor: "rgba(255,255,255,0.35)",
                animation: "voiceOrbSpin 1.1s linear infinite",
              }}
            />
          )}
        </div>
      </div>

      {/* Controls — glass pills, contextual to state */}
      <div
        className="flex items-center gap-4"
        style={{
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 260ms ease 80ms, transform 260ms ease 80ms",
        }}
      >
        {isRecording && (
          <>
            <GlassButton onClick={onCancel} label="Cancel" danger>
              <X className="w-4.5 h-4.5" strokeWidth={2} />
            </GlassButton>
            <GlassButton onClick={isPaused ? onResume : onPause} label={isPaused ? "Resume" : "Pause"}>
              {isPaused ? <Play className="w-4.5 h-4.5" strokeWidth={2} /> : <Pause className="w-4.5 h-4.5" strokeWidth={2} />}
            </GlassButton>
            <GlassButton onClick={onSend} label="Send">
              <Send className="w-4.5 h-4.5" strokeWidth={2} />
            </GlassButton>
          </>
        )}

        {(isProcessing || isSpeaking) && (
          <GlassButton onClick={onStopSpeaking} label="Stop">
            <Square className="w-4 h-4" strokeWidth={2} fill="currentColor" />
          </GlassButton>
        )}
      </div>

      <style jsx>{`
        @keyframes voiceOrbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
