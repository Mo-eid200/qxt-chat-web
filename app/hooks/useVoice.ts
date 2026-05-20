"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { API_BASE } from "../lib/config";
import { getStoredToken } from "../lib/api/core/qxtClient";

type VoiceKind = "audio" | "recording" | "text" | "stream_update" | "audio_update";

type VoiceMessagePayload = {
    id?: string;
    text?: string;
    audioUrl?: string;
    role: "user" | "assistant";
    kind?: VoiceKind;
};

type MetaResponse = {
    trace_id?: string;
    session_id: string;
    user_request_id: string;
    assistant_request_id: string;
    user_text: string;
    response_text: string;
    language?: string;
};

type Props = {
    voiceMode: boolean;
    selectedModel?: { id: string };
    sessionId?: string;
    onCompleteAction?: () => void;
    onMessageAction?: (data: VoiceMessagePayload) => void;
    onSessionCreatedAction?: (id: string) => void;
    onStreamAction?: (stream: MediaStream | null) => void;
};

export const useVoice = ({
    voiceMode,
    selectedModel,
    sessionId,
    onCompleteAction,
    onMessageAction,
    onSessionCreatedAction,
    onStreamAction,
}: Props) => {
    // ========================
    // STATE
    // ========================
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [liveStatus, setLiveStatus] = useState<string>("");

    // ========================
    // REFS
    // ========================
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);
    const mimeTypeRef = useRef<string>("audio/webm");
    const hasSentRef = useRef(false);

    // stable id per voice turn (recording -> stt text -> assistant text)
    const turnIdRef = useRef<string | null>(null);

    // request / cancel
    const isSendingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isCancelledRef = useRef(false);

    // audio playback
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    // last meta (to correlate)
    const lastMetaRef = useRef<MetaResponse | null>(null);

    // ========================
    // CONSTANTS
    // ========================
    const MIN_AUDIO_SIZE = 1500;
    const REQUEST_TIMEOUT = 90000;

    // ========================
    // HELPERS
    // ========================
    const cleanupAudio = useCallback(() => {
        try {
            if (audioElementRef.current) {
                try {
                    audioElementRef.current.pause();
                } catch { }
                audioElementRef.current.src = "";
                audioElementRef.current.onended = null;
                audioElementRef.current.onerror = null;
                audioElementRef.current = null;
            }

            if (objectUrlRef.current) {
                try {
                    URL.revokeObjectURL(objectUrlRef.current);
                } catch { }
                objectUrlRef.current = null;
            }
        } catch (err) {
            console.warn("[VOICE] ⚠️ cleanupAudio error:", err);
        }
    }, []);

    const buildAuthHeaders = useCallback(() => {
        const token = getStoredToken();
        return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }, []);

    const abortWithTimeout = useCallback(() => {
        abortControllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => {
            abortControllerRef.current?.abort();
        }, REQUEST_TIMEOUT);
        return { signal: abortControllerRef.current.signal, timeoutId };
    }, []);

    // ========================
    // 🎵 PLAY AUDIO RESPONSE (AUDIO ONLY)
    // ========================
    const playAudioResponse = useCallback(
        async (response: Response) => {
            setLiveStatus("🎵 Playing audio...");

            const audioBlob = await response.blob();

            cleanupAudio();

            const url = URL.createObjectURL(audioBlob);
            objectUrlRef.current = url;

            const audio = new Audio(url);
            audioElementRef.current = audio;

            audio.onended = () => {
                cleanupAudio();
                setIsProcessing(false);
                setLiveStatus("✅ Done");
                onCompleteAction?.();
            };

            audio.onerror = () => {
                console.warn("[VOICE] ⚠️ audio error (ignored)");
            };

            try {
                await audio.play();
            } catch (err: any) {
                if (err?.name === "NotAllowedError") {
                    setLiveStatus("🔊 Click anywhere to play audio");
                    const clickHandler = async () => {
                        try {
                            await audio.play();
                        } catch { }
                        document.removeEventListener("click", clickHandler);
                    };
                    document.addEventListener("click", clickHandler, { once: true });
                } else {
                    console.warn("[VOICE] ⚠️ audio.play() failed:", err);
                }
            }
        },
        [cleanupAudio, onCompleteAction]
    );

    // ========================
    // 📩 1) META REQUEST (STT + LLM) -> JSON
    // ========================
    const fetchMeta = useCallback(
        async (blob: Blob, turnId: string): Promise<MetaResponse> => {
            if (!sessionId) throw new Error("No session ID");
            if (!blob?.size) throw new Error("Empty blob");

            setLiveStatus("🧠 Transcribing & generating text...");

            const formData = new FormData();
            formData.append(
                "file",
                blob,
                `voice.${mimeTypeRef.current.includes("webm") ? "webm" : "mp4"}`
            );
            formData.append("model", selectedModel?.id || "gpt-4o-mini");
            formData.append("session_id", sessionId);

            const { signal, timeoutId } = abortWithTimeout();

            const res = await fetch(`${API_BASE}/api/v1/voice/chat/meta`, {
                method: "POST",
                body: formData,
                signal,
                headers: {
                    ...buildAuthHeaders(),
                },
                credentials: "include",
            }).finally(() => clearTimeout(timeoutId));

            if (!res.ok) {
                const t = await res.text().catch(() => "");
                throw new Error(t || `${res.status}`);
            }

            const meta = (await res.json()) as MetaResponse;

            // validate minimal fields
            if (!meta?.user_text || !meta?.response_text) {
                throw new Error("Invalid meta response (missing user_text/response_text)");
            }

            lastMetaRef.current = meta;

            // ✅ Update bubbles immediately from JSON (NO HEADERS NEEDED)
            onMessageAction?.({
                id: turnId,
                role: "user",
                kind: "text",
                text: meta.user_text,
            });

            onMessageAction?.({
                id: `assistant-${turnId}`,
                role: "assistant",
                kind: "text",
                text: meta.response_text,
            });

            return meta;
        },
        [API_BASE, abortWithTimeout, buildAuthHeaders, onMessageAction, selectedModel?.id, sessionId]
    );

    // ========================
    // 🎧 2) AUDIO REQUEST (TTS STREAM) -> MP3
    // ========================
    const fetchAudio = useCallback(
        async (blob: Blob, meta: MetaResponse) => {
            if (!sessionId) throw new Error("No session ID");
            if (!blob?.size) throw new Error("Empty blob");

            setLiveStatus("🔊 Generating voice...");

            const formData = new FormData();
            formData.append(
                "file",
                blob,
                `voice.${mimeTypeRef.current.includes("webm") ? "webm" : "mp4"}`
            );
            formData.append("model", selectedModel?.id || "gpt-4o-mini");
            formData.append("session_id", sessionId);

            // ✅ send meta to skip STT+LLM on backend
            formData.append("user_text", meta.user_text);
            formData.append("response_text", meta.response_text);
            formData.append("user_request_id", meta.user_request_id);
            formData.append("assistant_request_id", meta.assistant_request_id);

            const { signal, timeoutId } = abortWithTimeout();

            const res = await fetch(`${API_BASE}/api/v1/voice/chat`, {
                method: "POST",
                body: formData,
                signal,
                headers: {
                    ...buildAuthHeaders(),
                },
                credentials: "include",
            }).finally(() => clearTimeout(timeoutId));

            if (!res.ok) {
                const t = await res.text().catch(() => "");
                throw new Error(t || `${res.status}`);
            }

            await playAudioResponse(res);
        },
        [API_BASE, abortWithTimeout, buildAuthHeaders, playAudioResponse, selectedModel?.id, sessionId]
    );

    // ========================
    // 📤 SEND AUDIO PIPELINE (META -> AUDIO)
    // ========================
    const sendAudioToBackend = useCallback(
        async (blob: Blob) => {
            if (!sessionId) throw new Error("No session ID");
            if (!blob?.size) throw new Error("Empty blob");

            if (isSendingRef.current) return;
            isSendingRef.current = true;

            try {
                setIsProcessing(true);
                setError(null);

                const turnId = turnIdRef.current || `voice-${Date.now()}`;
                turnIdRef.current = turnId;

                // ✅ assistant waiting bubble already exists from onstop()
                const meta = await fetchMeta(blob, turnId);
                await fetchAudio(blob, meta);
            } finally {
                isSendingRef.current = false;
            }
        },
        [fetchAudio, fetchMeta, sessionId]
    );

    // ========================
    // 🎤 START/STOP RECORDING (TOGGLE)
    // ========================
    const startRecording = useCallback(async () => {
        // STOP
        if (mediaRecorderRef.current?.state === "recording") {
            const duration = Date.now() - startTimeRef.current;
            if (duration < 1000) return;

            setLiveStatus("⏹️ Sending...");
            try {
                mediaRecorderRef.current.stop();
            } catch { }

            try {
                streamRef.current?.getTracks().forEach((t) => t.stop());
            } catch { }

            mediaRecorderRef.current = null;
            streamRef.current = null;
            onStreamAction?.(null);
            setIsRecording(false);
            return;
        }

        // START
        cleanupAudio();
        chunksRef.current = [];

        setError(null);
        setIsProcessing(false);
        setLiveStatus("🎤 Recording...");
        hasSentRef.current = false;
        isCancelledRef.current = false;

        // new stable turn id
        const turnId = `voice-${Date.now()}`;
        turnIdRef.current = turnId;

        // show recording bubble immediately
        onMessageAction?.({
            id: turnId,
            role: "user",
            kind: "recording",
            text: "",
        });

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1,
                sampleRate: 16000,
            },
        });

        streamRef.current = stream;
        onStreamAction?.(stream);

        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : "audio/mp4";

        mimeTypeRef.current = mime;

        const recorder = new MediaRecorder(stream, { mimeType: mime });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
            if (hasSentRef.current) return;
            hasSentRef.current = true;

            setTimeout(() => {
                try {
                    const audioBlob = new Blob(chunksRef.current, { type: mime });

                    if (audioBlob.size < MIN_AUDIO_SIZE) {
                        setError("Recording too short");
                        setLiveStatus("");
                        setIsProcessing(false);
                        return;
                    }

                    // create assistant waiting bubble immediately after stop
                    const tid = turnIdRef.current || turnId;
                    onMessageAction?.({
                        id: `assistant-${tid}`,
                        role: "assistant",
                        kind: "stream_update",
                        text: "...",
                    });

                    if (!isCancelledRef.current) {
                        void sendAudioToBackend(audioBlob);
                    } else {
                        isCancelledRef.current = false;
                    }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : "Unknown";
                    setError(msg);
                    setLiveStatus("");
                    setIsProcessing(false);
                }
            }, 0);
        };

        recorder.onerror = (event: any) => {
            setError(`Recording error: ${event?.error || "Unknown"}`);
            setLiveStatus("");
        };

        startTimeRef.current = Date.now();
        recorder.start();
        setIsRecording(true);
    }, [cleanupAudio, onMessageAction, sendAudioToBackend, onStreamAction]);

    // ========================
    // 🛑 INTERRUPT VOICE
    // ========================
    const interruptVoice = useCallback(async () => {
        try {
            isCancelledRef.current = true;

            if (mediaRecorderRef.current?.state === "recording") {
                try {
                    mediaRecorderRef.current.stop();
                } catch { }
            }

            try {
                streamRef.current?.getTracks().forEach((t) => t.stop());
            } catch { }

            mediaRecorderRef.current = null;
            streamRef.current = null;
            onStreamAction?.(null);

            cleanupAudio();
            abortControllerRef.current?.abort();

            if (sessionId) {
                try {
                    await fetch(`${API_BASE}/api/v1/voice/interrupt/${sessionId}`, {
                        method: "POST",
                        headers: {
                            ...buildAuthHeaders(),
                        },
                        credentials: "include",
                    });
                } catch { }
            }

            setIsRecording(false);
            setIsProcessing(false);
            setLiveStatus("");
        } catch (err) {
            console.error("[VOICE] interruptVoice error:", err);
        }
    }, [API_BASE, buildAuthHeaders, cleanupAudio, sessionId, onStreamAction]);

    // ========================
    // 🧹 CLEANUP
    // ========================
    useEffect(() => {
        return () => {
            try {
                if (mediaRecorderRef.current?.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
            } catch { }

            try {
                streamRef.current?.getTracks().forEach((t) => t.stop());
            } catch { }

            onStreamAction?.(null);
            cleanupAudio();
            abortControllerRef.current?.abort();
        };
    }, [cleanupAudio, onStreamAction]);

    useEffect(() => {
        if (!sessionId) return;

        setIsRecording(false);
        setIsProcessing(false);
        setLiveStatus("");
        setError(null);

        chunksRef.current = [];
        turnIdRef.current = null;
        lastMetaRef.current = null;
        onStreamAction?.(null);

        cleanupAudio();
    }, [sessionId, cleanupAudio, onStreamAction]);

    // ========================
    // PUBLIC API
    // ========================
    if (!voiceMode) {
        return {
            isRecording: false,
            isProcessing: false,
            error: null,
            liveStatus: "",
            startRecording: async () => { },
            interruptVoice: async () => { },
        };
    }

    return {
        isRecording,
        isProcessing,
        error,
        liveStatus,
        startRecording,
        interruptVoice,
    };
};