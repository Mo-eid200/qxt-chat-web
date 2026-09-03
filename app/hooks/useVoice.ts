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
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    // ✅ Real AI activity status — same {stage, detail} events the
    // typed chat's AIStatus.tsx already consumes (thinking/searching/
    // analyzing/generating/writing + rich per-tool detail text), now
    // also driving the voice orb instead of static placeholder text.
    const [voiceStage, setVoiceStage] = useState<string | null>(null);
    const [voiceDetail, setVoiceDetail] = useState<string | undefined>(undefined);
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

    const sessionIdRef = useRef<string | undefined>(sessionId);

    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    // stable id per voice turn (recording -> stt text -> assistant text)
    const turnIdRef = useRef<string | null>(null);

    // request / cancel
    const isSendingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isCancelledRef = useRef(false);

    // audio playback
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    // ✅ NEW: sentence-audio playback queue. The backend now streams
    // one audio_chunk_ready event per completed sentence instead of
    // one MP3 for the whole reply — this queue plays each chunk the
    // moment it's ready, in order, without waiting for the rest of
    // the reply to finish generating/synthesizing.
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingQueueRef = useRef(false);
    const streamEndedRef = useRef(false);
    // ✅ Set when the user explicitly stops playback mid-reply. Any
    // audio_chunk_ready events that arrive from the backend AFTER
    // this point (the SSE stream keeps generating even after the
    // client stops listening) get silently dropped instead of
    // auto-playing the next sentence — this was the "stop, then it
    // plays the next chunk anyway" bug.
    const stoppedRef = useRef(false);

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
    // 🎵 SENTENCE AUDIO QUEUE
    // ========================
    // ✅ Plays queued sentence-audio URLs back to back. Called once
    // per audio_chunk_ready event to enqueue, and drains itself
    // automatically — the first sentence starts playing as soon as
    // it arrives, later sentences queue up behind it.
    const playNextInQueue = useCallback(() => {
        const next = audioQueueRef.current.shift();

        if (!next) {
            isPlayingQueueRef.current = false;
            // Only finalize once the backend stream has also finished
            // (no more sentences are coming) — otherwise we'd flicker
            // isSpeaking off between sentences while more are en route.
            if (streamEndedRef.current) {
                setIsSpeaking(false);
                setIsProcessing(false);
                setLiveStatus("✅ Done");
                onCompleteAction?.();
            }
            return;
        }

        isPlayingQueueRef.current = true;
        cleanupAudio();

        const audio = new Audio(next);
        audioElementRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => playNextInQueue();
        audio.onerror = () => {
            console.warn("[VOICE] ⚠️ sentence audio error (skipped)");
            playNextInQueue();
        };

        audio.play().catch((err) => {
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
                playNextInQueue();
            }
        });
    }, [cleanupAudio, onCompleteAction]);

    const enqueueAudioChunk = useCallback(
        (audioUrl: string) => {
            if (stoppedRef.current) return;
            audioQueueRef.current.push(audioUrl);
            if (!isPlayingQueueRef.current) {
                playNextInQueue();
            }
        },
        [playNextInQueue]
    );

    // ========================
    // 📩 META REQUEST (STT + LLM + per-sentence audio) -> SSE
    // ========================
    // ✅ Reads the backend's SSE stream: user_text -> status* ->
    // text_delta* -> audio_chunk_ready* -> done. The assistant bubble
    // fills in token-by-token exactly like typed chat, and sentence
    // audio starts playing the moment the FIRST sentence is ready —
    // no more waiting for the whole reply (text or audio) to finish.
    const fetchMeta = useCallback(
        async (blob: Blob, turnId: string): Promise<MetaResponse> => {
            const sid = sessionIdRef.current;

            if (!sid) throw new Error("No session ID");
            if (!blob?.size) throw new Error("Empty blob");

            setLiveStatus("🧠 Transcribing...");
            audioQueueRef.current = [];
            isPlayingQueueRef.current = false;
            streamEndedRef.current = false;
            stoppedRef.current = false;

            const formData = new FormData();
            formData.append(
                "file",
                blob,
                `voice.${mimeTypeRef.current.includes("webm") ? "webm" : "mp4"}`
            );
            formData.append("model", selectedModel?.id || "");
            formData.append("session_id", sid);

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

            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let responseText = "";
            let doneMeta: MetaResponse | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let boundary: number;
                while ((boundary = buffer.indexOf("\n\n")) !== -1) {
                    const chunk = buffer.slice(0, boundary).trim();
                    buffer = buffer.slice(boundary + 2);
                    if (!chunk.startsWith("data:")) continue;
                    const data = chunk.replace("data:", "").trim();
                    if (!data) continue;

                    let evt: any;
                    try {
                        evt = JSON.parse(data);
                    } catch {
                        continue;
                    }

                    // ✅ Same status events the typed-chat SSE stream
                    // carries (choices[0].delta.status -> {stage, detail}).
                    if (evt.status?.stage) {
                        setVoiceStage(evt.status.stage);
                        setVoiceDetail(evt.status.detail);
                    }

                    if (evt.type === "user_text") {
                        onMessageAction?.({
                            id: turnId,
                            role: "user",
                            kind: "text",
                            text: evt.text,
                        });
                        setLiveStatus("💬 Replying...");
                    } else if (evt.type === "text_delta") {
                        responseText += evt.delta;
                        onMessageAction?.({
                            id: `assistant-${turnId}`,
                            role: "assistant",
                            kind: "stream_update",
                            text: responseText,
                        });
                    } else if (evt.type === "audio_chunk_ready") {
                        // ✅ Start playback of this sentence immediately
                        // — don't wait for the rest of the reply.
                        if (evt.audio_url) {
                            enqueueAudioChunk(evt.audio_url);
                        }
                    } else if (evt.type === "error") {
                        throw new Error(evt.message || "Voice reply failed");
                    } else if (evt.type === "done") {
                        doneMeta = {
                            trace_id: evt.trace_id,
                            session_id: evt.session_id,
                            user_request_id: evt.user_request_id,
                            assistant_request_id: evt.assistant_request_id,
                            user_text: evt.user_text,
                            response_text: evt.response_text,
                            language: evt.language,
                        };
                    }
                }
            }

            if (!doneMeta?.user_text || !doneMeta?.response_text) {
                throw new Error("Invalid meta response (missing user_text/response_text)");
            }

            onMessageAction?.({
                id: `assistant-${turnId}`,
                role: "assistant",
                kind: "text",
                text: doneMeta.response_text,
            });

            lastMetaRef.current = doneMeta;

            // ✅ Mark the stream as finished — if the queue is already
            // empty (all sentences played before the reply text even
            // finished streaming, for short replies), finalize right
            // away instead of waiting on a queue that'll never drain
            // further.
            streamEndedRef.current = true;
            if (!isPlayingQueueRef.current && audioQueueRef.current.length === 0) {
                setIsSpeaking(false);
                setIsProcessing(false);
                setLiveStatus("✅ Done");
                onCompleteAction?.();
            }

            return doneMeta;
        },
        [
            abortWithTimeout,
            buildAuthHeaders,
            enqueueAudioChunk,
            onCompleteAction,
            onMessageAction,
            selectedModel?.id,
        ]
    );

    // ========================
    // 📤 SEND AUDIO PIPELINE
    // ========================
    // ✅ Audio now arrives as part of fetchMeta's own SSE stream
    // (audio_chunk_ready events, played via the queue above) — no
    // second request to /voice/chat needed for a fresh turn.
    const sendAudioToBackend = useCallback(
        async (blob: Blob) => {
            const sid = sessionIdRef.current;
            if (!sid) throw new Error("No session ID");
            if (!blob?.size) throw new Error("Empty blob");

            if (isSendingRef.current) return;
            isSendingRef.current = true;

            try {
                setIsProcessing(true);
                setError(null);

                const turnId = turnIdRef.current || `voice-${Date.now()}`;
                turnIdRef.current = turnId;

                await fetchMeta(blob, turnId);
            } finally {
                isSendingRef.current = false;
            }
        },
        [fetchMeta]
    );

    // ========================
    // 🎤 START/STOP RECORDING (TOGGLE)
    // ========================
    const startRecording = useCallback(async (forcedSessionId?: string) => {

        if (forcedSessionId) {
            sessionIdRef.current = forcedSessionId;
        }
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
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
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

                    const tid = turnIdRef.current!;
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
                    const msg =
                        err instanceof Error ? err.message : "Unknown";

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

        const turnId = `voice-${Date.now()}`;
        turnIdRef.current = turnId;

        onMessageAction?.({
            id: turnId,
            role: "user",
            kind: "recording",
            text: "",
        });

    }, [cleanupAudio, onMessageAction, sendAudioToBackend, onStreamAction]);

    // ========================
    // ⏸️ PAUSE / RESUME RECORDING
    // ========================
    // ✅ Pause/resume the in-progress recording (does NOT send or
    // cancel it — the recorded audio so far is kept, MediaRecorder
    // just stops capturing new chunks until resumed).
    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            try {
                mediaRecorderRef.current.pause();
                setIsPaused(true);
                setLiveStatus("⏸️ Paused");
            } catch { }
        }
    }, []);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "paused") {
            try {
                mediaRecorderRef.current.resume();
                setIsPaused(false);
                setLiveStatus("🎤 Recording...");
            } catch { }
        }
    }, []);

    // ✅ Stops ONLY the assistant's voice playback (and clears the
    // pending sentence queue) — unlike interruptVoice (which tears
    // down the whole turn/session state), this just silences the
    // current audio so the user can keep chatting immediately,
    // matching the "stop while it's speaking" control from
    // ChatGPT/Claude voice mode.
    const stopSpeaking = useCallback(() => {
        stoppedRef.current = true;
        audioQueueRef.current = [];
        isPlayingQueueRef.current = false;
        setIsSpeaking(false);
        cleanupAudio();
        setIsProcessing(false);
        setLiveStatus("");
    }, [cleanupAudio]);

    // ========================
    // 🛑 INTERRUPT VOICE
    // ========================
    const interruptVoice = useCallback(async () => {
        try {
            isCancelledRef.current = true;
            stoppedRef.current = true;
            audioQueueRef.current = [];
            isPlayingQueueRef.current = false;
            setIsSpeaking(false);

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

            const sid = sessionIdRef.current;
            if (sid) {
                try {
                    await fetch(`${API_BASE}/api/v1/voice/interrupt/${sid}`, {
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
    }, [buildAuthHeaders, cleanupAudio, onStreamAction]);

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

        // لا تعمل Reset أثناء وجود Recording أو Recorder
        if (isRecording || mediaRecorderRef.current) return;

        setIsRecording(false);
        setIsProcessing(false);
        setLiveStatus("");
        setError(null);

        chunksRef.current = [];
        turnIdRef.current = null;
        lastMetaRef.current = null;
        onStreamAction?.(null);

        cleanupAudio();

    }, [
        sessionId,
        isRecording,
        cleanupAudio,
        onStreamAction,
    ]);

    // ========================
    // PUBLIC API
    // ========================
    if (!voiceMode) {
        return {
            isRecording: false,
            isProcessing: false,
            isSpeaking: false,
            isPaused: false,
            voiceStage: null,
            voiceDetail: undefined,
            error: null,
            liveStatus: "",
            startRecording: async () => { },
            interruptVoice: async () => { },
            pauseRecording: () => { },
            resumeRecording: () => { },
            stopSpeaking: () => { },
        };
    }

    return {
        isRecording,
        isProcessing,
        isSpeaking,
        isPaused,
        voiceStage,
        voiceDetail,
        error,
        liveStatus,
        startRecording,
        interruptVoice,
        pauseRecording,
        resumeRecording,
        stopSpeaking,
    };
};
