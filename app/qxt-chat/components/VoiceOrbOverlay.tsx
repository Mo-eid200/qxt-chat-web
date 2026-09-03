"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

type OrbState = "listening" | "processing" | "speaking";

type Props = {
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  stream: MediaStream | null;
  onCancel: () => void;
};

// ✅ Color themes per state — no harsh red, calm modern gradients
const THEME: Record<OrbState, { from: string; to: string; ring: string; glow: string }> = {
  listening: { from: "#818cf8", to: "#6366f1", ring: "rgba(129,140,248,0.35)", glow: "rgba(99,102,241,0.45)" },
  processing: { from: "#818cf8", to: "#6366f1", ring: "rgba(129,140,248,0.25)", glow: "rgba(99,102,241,0.35)" },
  speaking: { from: "#34d399", to: "#10b981", ring: "rgba(52,211,153,0.35)", glow: "rgba(16,185,129,0.45)" },
};

export function VoiceOrbOverlay({ isRecording, isProcessing, isSpeaking, stream, onCancel }: Props) {
  const [mounted, setMounted] = useState(false);
  const [level, setLevel] = useState(0); // 0..1 audio level for the pulsing ring
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const active = isRecording || isProcessing || isSpeaking;
  const state: OrbState = isSpeaking ? "speaking" : isProcessing ? "processing" : "listening";
  const theme = THEME[state];

  // Mount/unmount with a tick of delay so the fade-out transition can play
  useEffect(() => {
    if (active) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [active]);

  // ✅ Real audio level analysis — hooked directly to the actual mic
  // stream (previously ChatFooter waited on window.__onVoiceStreamReady,
  // a global no one ever called — this connects directly to the
  // `stream` prop passed down from useVoice's onStreamAction instead).
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
    if (!stream || !isRecording) {
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
  }, [stream, isRecording, tick]);

  // Gentle idle pulse for processing/speaking (no live mic level then)
  const [idlePulse, setIdlePulse] = useState(0);
  useEffect(() => {
    if (isRecording) return; // real level drives it while listening
    let raf: number;
    const start = performance.now();
    const loop = (t: number) => {
      const elapsed = (t - start) / 1000;
      setIdlePulse((Math.sin(elapsed * 2.4) + 1) / 2); // 0..1 smooth breathing
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isRecording, state]);

  if (!mounted) return null;

  const ringLevel = isRecording ? level : idlePulse;
  const ringScale = 1 + ringLevel * 0.35;
  const isSpinning = state === "processing";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background: "rgba(0,0,0,0.35)",
        opacity: active ? 1 : 0,
        transition: "opacity 260ms ease",
        pointerEvents: active ? "auto" : "none",
      }}
      onClick={onCancel}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 160,
          height: 160,
          transform: `scale(${active ? 1 : 0.85})`,
          transition: "transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Outer pulsing ring — reacts to real audio level */}
        <div
          className="absolute rounded-full"
          style={{
            width: 140,
            height: 140,
            background: theme.ring,
            transform: `scale(${ringScale})`,
            transition: isRecording ? "transform 80ms linear" : "transform 400ms ease",
            filter: "blur(2px)",
          }}
        />
        {/* Soft outer glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
          }}
        />
        {/* Core orb */}
        <div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: 96,
            height: 96,
            background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
            boxShadow: `0 0 30px ${theme.glow}`,
            transition: "background 400ms ease",
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

      {/* Hint text */}
      <div
        className="absolute text-white/70 text-sm font-medium tracking-wide"
        style={{
          bottom: "calc(50% - 130px)",
          opacity: active ? 1 : 0,
          transition: "opacity 300ms ease 100ms",
        }}
      >
        {state === "listening" && "بيسمعك..."}
        {state === "processing" && "بيفكر..."}
        {state === "speaking" && "بيرد..."}
      </div>
      <div
        className="absolute text-white/40 text-xs"
        style={{
          bottom: "calc(50% - 155px)",
          opacity: active ? 1 : 0,
          transition: "opacity 300ms ease 150ms",
        }}
      >
        اضغط في أي مكان للإلغاء
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
