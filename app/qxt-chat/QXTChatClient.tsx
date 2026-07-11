"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { ChatHeader }    from "./components/ChatHeader";
import ChatSidebar       from "./components/sidebar/ChatSidebar";
import { ChatFooter }    from "./components/ChatFooter";
import AuthModal         from "./components/AuthModal";
import { PersonalUpgradeModal }  from "./components/PersonalUpgradeModal";
import { WorkspaceUpgradeModal }  from "./components/WorkspaceUpgradeModal";
import ChatMessages      from "./components/ChatMessages";
import RenameDialog      from "./components/RenameDialog";

import { API_BASE } from "../lib/config";
import {
  getStoredToken,
  getStoredLastSession,
  setStoredLastSession,
  getStoredContext,
} from "../lib/api/core/qxtClient";

import { useAuth }   from "../context/AuthContext";
import { useModels } from "../context/ModelsContext";
import { useAgentRuntime } from "../context/AgentRuntimeContext";

import { getChatRoute }     from "../lib/runtime/getChatRoute";
import { useChatSessions }  from "../hooks/useChatSessions";

import type { AgentRuntime }                          from "../types/agent";
import type { ChatMessage, Reaction, PendingStage, AIStage, VoiceMessagePayload } from "../types/chat";

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function QXTChatClient({
  agentRuntime,
}: {
  agentRuntime?: AgentRuntime;
}) {
  return <QXTChatInner agentRuntime={agentRuntime} />;
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function QXTChatInner({ agentRuntime }: { agentRuntime?: AgentRuntime }) {
  const router = useRouter();
  const sp     = useSearchParams();

  const { user, loadingUser } = useAuth();
  const isLoggedIn = !!user;

const { selected, models, selectModel } = useModels();

const { activeAgentId: runtimeAgentId } = useAgentRuntime(); 

const runtimeRef = useRef(getStoredContext());
const runtime    = runtimeRef.current;

const activeAgentId =
  agentRuntime?.agent?.id || runtimeAgentId || runtime.activeAgentId || null; 

const activeWorkspaceId =
  runtime.spaceType === "workspace" ? runtime.workspaceId : null;

const activeSpaceType = runtime.spaceType;

  /* =========================================================
     STATE
  ========================================================= */

  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [input, setInput]                   = useState("");
  const [loading, setLoading]               = useState(false);
  const [streaming, setStreaming]           = useState(false);
  const [streamText, setStreamText]         = useState("");
  const [pendingStage, setPendingStage]     = useState<PendingStage>(null);
  const [stageHistory, setStageHistory]     = useState<AIStage[]>([]);
  const [darkMode, setDarkMode]             = useState(true);
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [lang, setLang]                     = useState<"en" | "ar">("en");
  const [shouldDockBottom, setShouldDockBottom] = useState(false);
  const [copiedIndex, setCopiedIndex]       = useState<number | null>(null);
  const [reactions, setReactions]           = useState<Record<number, Reaction>>({});
  const [expandedMsgs, setExpandedMsgs]     = useState<Record<number, boolean>>({});
  const [editingIndex, setEditingIndex]     = useState<number | null>(null);
  const [editingText, setEditingText]       = useState("");
  const [pendingImages, setPendingImages]   = useState<Array<{ url: string; preview: string; type: "image" | "video" }>>([]);
  const [pendingDocuments, setPendingDocuments] = useState<Array<{ url: string; name: string; size?: number; mimeType?: string }>>([]);
  const [upgradeOpen, setUpgradeOpen]       = useState(false);
  const [authOpen, setAuthOpen]             = useState(false);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");

  /* =========================================================
     REFS
  ========================================================= */

  const abortRef              = useRef<AbortController | null>(null);
  const bottomRef             = useRef<HTMLDivElement | null>(null);
  const messagesRef           = useRef<ChatMessage[]>([]);
  const shouldAutoScrollRef   = useRef(true);
  const sendingRef            = useRef(false);
  const limitReachedRef       = useRef(false);
  const pendingTimersRef      = useRef<number[]>([]);
  const isMountedRef          = useRef(true);
  const hydratedRef           = useRef(false);
  const hydratingSessionRef   = useRef<string | null>(null);
  const phraseIndexRef        = useRef(0);

  /* =========================================================
     UI COMPUTED
  ========================================================= */

  const conversationStarted = useMemo(
    () => messages.length > 0 || streaming || streamText.length > 0,
    [messages, streaming, streamText]
  );

  const busy          = loading || streaming || !!pendingStage;
  const composerMode  = shouldDockBottom ? "bottom" : "center";
  const isAr          = lang === "ar";
  const assistantName = "Quarc";
  const messageDir    = isAr ? "rtl" : "ltr";
  const messageTextAlign = isAr ? "text-right" : "text-left";

  const userName =
    (user as any)?.full_name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    null;

  // Single unified dark theme — matches the openqcore-web design
  // system (gray/black base, accent color only via CSS var --accent
  // which the sidebar's environment toggle sets on <html data-scope>).
  // No more light-mode branch, no more green/cyan/emerald mismatched
  // accents.
  const rootBG = "bg-[#0a0a0b]";
  const overlayGrid = "bg-[radial-gradient(circle_at_top,_var(--accent-hover),_transparent_55%)]";
  const baseText = "text-white/90";
  const scrollClasses = "qxt-scroll scroll-smooth";
  const welcomeTitle  = "Welcome to Chat-QXT";
  const welcomeBody   = "Start by typing any idea, question, or project you'd like us to work on together.";

  const rotatingHints = useMemo(() => [
    "Improve your CV or LinkedIn profile.",
    "Ask for an online business plan.",
    "Validate a startup idea step by step.",
    "Craft a powerful email or outreach message.",
    "Design a marketing plan for your project.",
  ], []);

  const placeholderPhrases = useRef([
    "Start your first conversation with Quarc...",
    ...rotatingHints,
    "Type any question or idea you have in mind...",
  ]).current;

  const activePlaceholder = "Type your message here, then press Enter to send...";

  /* =========================================================
     STAGE CALLBACKS
  ========================================================= */

  const clearPendingTimers = useCallback(() => {
    pendingTimersRef.current.forEach((t) => window.clearTimeout(t));
    pendingTimersRef.current = [];
  }, []);

  const stopPendingStage = useCallback(() => {
    clearPendingTimers();
    setPendingStage(null);
    setStageHistory([]);
  }, [clearPendingTimers]);

  const startPendingStage = useCallback(() => {
    clearPendingTimers();
    setPendingStage(null);
    setStageHistory([]);

    const t1 = window.setTimeout(() => {
      if (isMountedRef.current) setPendingStage("thinking");
    }, 200);

    const t2 = window.setTimeout(() => {
      if (isMountedRef.current) {
        setStageHistory((prev) => [...prev, "thinking"]);
        setPendingStage("analyzing");
      }
    }, 700);

    const t3 = window.setTimeout(() => {
      if (isMountedRef.current) {
        setStageHistory((prev) => [...prev, "analyzing"]);
        setPendingStage("searching");
      }
    }, 1200);

    const t4 = window.setTimeout(() => {
      if (isMountedRef.current) {
        setStageHistory((prev) => [...prev, "searching"]);
        setPendingStage("generating");
      }
    }, 1700);

    pendingTimersRef.current = [t1, t2, t3, t4];
  }, [clearPendingTimers]);

  const stopRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setStreaming(false);
    setStreamText("");
    stopPendingStage();
  }, [stopPendingStage]);

  /* =========================================================
     SESSIONS HOOK
  ========================================================= */

  const {
    sessionId, setSessionId,
    sessions, workspaceTree, workspaceBusy,
    renameOpen, renameDraft, setRenameDraft,
    createChatSession, reloadSessionMessages,
    refreshSessions, refreshWorkspace,
    openSession, handleDeleteSession,
    handleNewChatInFolder, handleNewChat,
    openRenameDialog, closeRenameDialog,
    submitRenameDialog, ensureSession,
    handleCreateProjectFolder,
    handleMoveSessionToFolder,
    handleReorderFolderSessions,
  } = useChatSessions({
    activeAgentId,
    streaming,
    loading,
    sendingRef,
    hydratedRef,
    isMountedRef,
    stopRequest,
    setMessages,
  });

  const activeSessionTitle = useMemo(() => {
    if (!sessionId) return null;
    return sessions.find((s) => String(s.id) === String(sessionId))?.title ?? null;
  }, [sessions, sessionId]);

  /* =========================================================
     PERSIST LAST SESSION
  ========================================================= */

  useEffect(() => {
    if (sessionId) setStoredLastSession(String(sessionId));
  }, [sessionId]);

  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      pendingTimersRef.current.forEach((t) => window.clearTimeout(t));
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  /* =========================================================
     PLACEHOLDER
  ========================================================= */

  useEffect(() => {
    if (conversationStarted) {
      setTypedPlaceholder(activePlaceholder);
      return;
    }

    const phrase = placeholderPhrases[phraseIndexRef.current];
    let charIndex = 0;
    setTypedPlaceholder("");

    const typing = window.setInterval(() => {
      setTypedPlaceholder(phrase.slice(0, charIndex + 1));
      charIndex++;

      if (charIndex >= phrase.length) {
        window.clearInterval(typing);
        window.setTimeout(() => {
          phraseIndexRef.current =
            (phraseIndexRef.current + 1) % placeholderPhrases.length;
          setTypedPlaceholder("");
        }, 2200);
      }
    }, 32);

    return () => window.clearInterval(typing);
  }, [conversationStarted, activePlaceholder, placeholderPhrases]);

  /* =========================================================
     SCROLL DETECTION
  ========================================================= */

  useEffect(() => {
    const el = bottomRef.current?.closest("main");
    if (!el) return;

    const onScroll = () => {
      shouldAutoScrollRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* =========================================================
     AUTO SCROLL
  ========================================================= */

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    bottomRef.current?.scrollIntoView({
      behavior: streaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, streaming]);

  /* =========================================================
     DOCK DETECTION
  ========================================================= */

  useEffect(() => {
    const el = bottomRef.current?.closest("main");
    if (!el) return;
    setShouldDockBottom(el.scrollHeight > el.clientHeight);
  }, [messages]);

  /* =========================================================
     SYNC MESSAGES REF
  ========================================================= */

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* =========================================================
     LOGOUT RESET
  ========================================================= */

  useEffect(() => {
    if (isLoggedIn) return;

    setSessionId(null);
    setStoredLastSession(null);
    setMessages([]);
    setStreaming(false);
    setStreamText("");
    setReactions({});
    setCopiedIndex(null);
    setExpandedMsgs({});
    setEditingIndex(null);
    setEditingText("");
    setInput("");
    setPendingImages([]);
    setPendingDocuments([]);
    hydratedRef.current       = false;
    hydratingSessionRef.current = null;

    router.replace(getChatRoute({ sessionId: null, agentId: activeAgentId }));
  }, [isLoggedIn, router, activeAgentId, setSessionId]);


  /* =========================================================
   AGENT CHANGE - refresh sessions when agent switches
========================================================= */

const prevAgentIdRef = useRef<string | null>(null);

useEffect(() => {
  // مش نعمل حاجة على أول load
  if (prevAgentIdRef.current === runtimeAgentId) return;
  prevAgentIdRef.current = runtimeAgentId;

  const token = getStoredToken();
  if (!token || loadingUser) return;

  // ✅ reset ونجيب sessions الـ agent الجديد
  stopRequest();
  setSessionId(null);
  setMessages([]);
  setStoredLastSession(null);
  hydratedRef.current = false;
  hydratingSessionRef.current = null;

  // 🔥 FIX: only refreshSessions() was called here — workspaceTree
  // (whose .unfiled the sidebar shows with priority over the properly
  // agent-scoped `sessions`) never got re-fetched on agent switch,
  // leaving it stuck showing whatever it had at mount time.
  refreshSessions();
  refreshWorkspace();
}, [runtimeAgentId]); // eslint-disable-line

  /* =========================================================
     MESSAGE CALLBACKS
  ========================================================= */

  const handleCopy = useCallback((text: string, idx: number) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(idx);
      window.setTimeout(() => setCopiedIndex(null), 1200);
    }).catch(() => {});
  }, []);

  const handleReaction = useCallback((idx: number, r: Reaction) => {
    setReactions((prev) => ({ ...prev, [idx]: prev[idx] === r ? null : r }));
  }, []);

  const handleShare = useCallback(async (text: string) => {
    try {
      if (navigator?.share) await navigator.share({ text });
      else if (navigator?.clipboard) await navigator.clipboard.writeText(text);
    } catch {}
  }, []);

  const handleReport = useCallback((text: string) => {
    alert("Report submitted:\n\n" + text);
  }, []);

  const isLongText = useCallback((s: any) => {
    const text = typeof s === "string" ? s : String(s ?? "");
    return text.length > 900 || text.split("\n").length > 14;
  }, []);

  const clampText = useCallback((s: any) => {
    const text  = typeof s === "string" ? s : String(s ?? "");
    const lines = text.split("\n");
    if (lines.length > 14) return lines.slice(0, 14).join("\n") + "\n...";
    if (text.length > 900) return text.slice(0, 900) + "...";
    return text;
  }, []);

  const startEdit  = useCallback((idx: number, original: string) => {
    setEditingIndex(idx);
    setEditingText(original);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingText("");
  }, []);

  const saveEdit = useCallback(() => {
    if (editingIndex == null) return;
    const value = editingText.trim();
    if (!value) return;
    setMessages((prev) =>
      prev.map((m, i) => (i === editingIndex ? { ...m, content: value } : m))
    );
    setEditingIndex(null);
    setEditingText("");
  }, [editingIndex, editingText]);

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  const sendMessage = useCallback(async (payload?: {
    text: string;
    model?: string;
    isVoiceActive?: boolean;
    injectedMessage?: ChatMessage;
    images?: string[];
    files?: any[];
  }) => {
    if (payload?.isVoiceActive) return;
    if (sendingRef.current || !isMountedRef.current) return;

    const userMessage = (payload?.text ?? input ?? "").trim();
    const hasImages   = !!payload?.images?.length;
    const hasFiles    = !!payload?.files?.length;

    if (
      (!userMessage && !hasImages && !hasFiles) ||
      loading || streaming || limitReachedRef.current
    ) return;

    const token = getStoredToken();
    if (!token) { setAuthOpen(true); return; }

    if (!models.length) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "⏳ Models are still loading, try again in a second.",
        kind: "text",
      }]);
      return;
    }

    const finalModel = payload?.model || agentRuntime?.model || selected?.id;
    if (!finalModel) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ No model selected.", kind: "text" }]);
      return;
    }

    sendingRef.current = true;
    setInput("");
    setLoading(true);
    setStreamText("");
    startPendingStage();
    setStreaming(true);

    try {
      const newUserMsg: ChatMessage = {
        id:        crypto.randomUUID(),
        role:      "user",
        content:   userMessage,
        kind:      hasFiles ? "document" : hasImages ? "image" : "text",
        images:    hasImages ? payload?.images : undefined,
        documents: hasFiles  ? payload?.files  : undefined,
      };

      setMessages((prev) => {
        const updated = [...prev, newUserMsg];
        messagesRef.current = updated;
        return updated;
      });

      const sid = await ensureSession();
      if (!sid) throw new Error("Session creation failed");

      setStoredLastSession(String(sid));

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      const updatedMessages: ChatMessage[] = payload?.injectedMessage
        ? [...messagesRef.current, payload.injectedMessage]
        : [...messagesRef.current];

      const cleanMessages = updatedMessages
        .filter((m) =>
          m?.role &&
          ["user", "assistant", "system"].includes(m.role) &&
          (
            (m.content && String(m.content).trim().length > 0) ||
            (m.images    && m.images.length > 0) ||
            (m.documents && m.documents.length > 0)
          )
        )
        .map((m) => {
  const hasMedia = !!(m.images?.length || m.documents?.length);

  const mapped: any = {
    role:    m.role,
    content: String(m.content ?? ""),
  };

  // بنبعت payload بس لو فيه media فعلاً
  if (hasMedia) {
    mapped.payload = {
      images:    m.images    || [],
      videos:    m.videos    || [],
      documents: m.documents || [],
      audio_url: m.audioUrl  || null,
    };
  }

  return mapped;
});

      const requestPayload = {
        model:      finalModel,
        session_id: sid,
        messages: [
          ...(agentRuntime?.systemPrompt
            ? [{ role: "system", content: agentRuntime.systemPrompt }]
            : []),
          ...cleanMessages.slice(-20),
        ],
        stream: true,
      };

      const workspaceId = activeSpaceType === "workspace" ? activeWorkspaceId : null;

      const response = await fetch(`${API_BASE}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${token}`,
          "X-Space-Type":  activeSpaceType,
          "X-Scope-Type":  activeSpaceType,
          ...(workspaceId  ? { "X-Workspace-ID": workspaceId }  : {}),
          ...(activeAgentId ? { "X-Agent-ID": activeAgentId }   : {}),
        },
        signal: abortRef.current.signal,
        body:   JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const raw = await response.clone().text();
        throw new Error(raw || `API error ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader  = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "", fullText = "", assistantAdded = false;

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
          if (!data || data === "[DONE]") continue;

          try {
            const json   = JSON.parse(data);
            const images = json?.choices?.[0]?.delta?.payload?.images || json?.payload?.images || [];

            if (images?.length > 0) {
              setStreamText("");
              setMessages((prev) => [...prev, {
                role: "assistant", content: "", images, kind: "image",
                id: crypto.randomUUID(),
              }]);
              continue;
            }

            const delta = json?.choices?.[0]?.delta?.content;
            if (!delta) continue;

            fullText += delta;
            setStreamText(fullText);

            if (!assistantAdded) {
              assistantAdded = true;
              setMessages((prev) => {
                const newMsg: ChatMessage = {
                  id: crypto.randomUUID(), role: "assistant",
                  content: delta, kind: "text",
                };
                const updated = [...prev, newMsg];
                messagesRef.current = updated;
                return updated;
              });
            } else {
              setMessages((prev) => {
                if (!prev.length) return prev;
                const last = prev[prev.length - 1];
                if (!last || last.role !== "assistant") return prev;
                const updated = [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + delta },
                ];
                messagesRef.current = updated;
                return updated;
              });
            }
          } catch {}
        }
      }

      reader.releaseLock();
      setStreaming(false);
      setStreamText("");
      stopPendingStage();

    } catch (error: any) {
      if (error?.name !== "AbortError") {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `❌ ${error?.message || "An error occurred"}`,
          kind: "text",
        }]);
      }
      setStreaming(false);
      setStreamText("");
      stopPendingStage();
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }, [
    input, loading, streaming, selected, models,
    startPendingStage, stopPendingStage, ensureSession, agentRuntime,
  ]);

  /* =========================================================
     HYDRATION - ✅ sessionId مش في الـ deps
  ========================================================= */

  useEffect(() => {
    if (loadingUser) return;

    const token = getStoredToken();
    if (!token) return;

    refreshWorkspace();
  }, [loadingUser, refreshWorkspace]);

  const sidParam = sp.get("sid");

  useEffect(() => {
    if (loadingUser || streaming || sendingRef.current) return;

    const token = getStoredToken();
    if (!token) return;

    // ✅ مانعمل hydration لو عملناه بالفعل لنفس الـ session
    const requestedSid = sidParam || getStoredLastSession() || null;

    if (
      hydratedRef.current &&
      hydratingSessionRef.current === String(requestedSid ?? "")
    ) return;

    let cancelled = false;

    async function hydrate() {
      try {
        const sessionItems = await refreshSessions();
        await refreshWorkspace();

        if (cancelled || !isMountedRef.current) return;

        const allIds = sessionItems.map((item: any) => String(item.id));

        if (
          requestedSid &&
          hydratingSessionRef.current === String(requestedSid) &&
          hydratedRef.current
        ) return;

        if (requestedSid && allIds.includes(String(requestedSid))) {
          hydratingSessionRef.current = String(requestedSid);
          setSessionId(String(requestedSid));
          setStoredLastSession(String(requestedSid));
          await reloadSessionMessages(String(requestedSid));
          if (cancelled || !isMountedRef.current) return;
          hydratedRef.current = true;
          return;
        }

        setSessionId(null);
        setMessages([]);
        hydratedRef.current = true;
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("Hydration error:", err);
        }
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, [
    loadingUser,
    sidParam,
    // ✅ sessionId اتشال من هنا - كان السبب الرئيسي في الـ loop
    refreshSessions,
    refreshWorkspace,
    reloadSessionMessages,
    streaming,
    activeAgentId,
    setSessionId,
  ]);

  /* =========================================================
     LAYOUT
  ========================================================= */

  const modelOptions = useMemo(
    () => models.map((m) => ({ id: m.id, label: m.public_name })),
    [models]
  );

  const CHAT_WIDTH   = "max-w-[740px] w-full";
  const DOCK_PB      = "pb-[280px] md:pb-[300px]";
  const contentShift = sidebarOpen ? "lg:-translate-x-8" : "";
  const contentWrap  = `${CHAT_WIDTH} mx-auto ${contentShift} transition-transform duration-300`;

  const footerProps = useMemo(() => ({
    input,
    loading: loading || streaming,
    lang,
    darkMode,
    placeholder: loadingUser ? "Loading session..." : typedPlaceholder,
    sessionId,

    onChange: (val: string) => setInput(val),

    onSend: async (data: {
      text: string; model: string;
      isVoiceActive?: boolean; images?: string[]; files?: any[];
    }) => sendMessage({
      text: data.text, model: data.model,
      isVoiceActive: data.isVoiceActive,
      images: data.images, files: data.files,
    }),

    onSessionChange: async (id: string) => {
      if (id === "NEED_SESSION") {
        setSessionId(null);
        setMessages([]);
        setStoredLastSession(null);
        router.replace(getChatRoute({ sessionId: null, agentId: activeAgentId }));
        return null;
      }
      setSessionId(id);
      setStoredLastSession(String(id));
      router.replace(getChatRoute({ sessionId: id, agentId: activeAgentId }));
      return id;
    },

    onStop: stopRequest,
    pendingImages,    setPendingImages,
    pendingDocuments, setPendingDocuments,

    selectedModel: selected
      ? { id: selected.id, label: models.find((m) => m.id === selected.id)?.public_name || selected.id }
      : null,

    models: modelOptions,
    onModelChange: (model: { id: string; label: string }) => selectModel(model.id),

    onVoiceMessage: (data: VoiceMessagePayload) => {
      const id       = (data as any).id       as string | undefined;
      const kind     = (data as any).kind     as string | undefined;
      const text     = (data as any).text     as string | undefined;
      const audioUrl = (data as any).audioUrl as string | undefined;

      if (!id) return;

      if (text === "__VOICE_CANCEL__") {
        const base = id.startsWith("assistant-") ? id.replace(/^assistant-/, "") : id;
        setMessages((prev) => {
          const filtered = prev.filter((m: any) => {
            const mid     = (m as any).id;
            const role    = (m as any).role;
            const kind2   = (m as any).kind;
            const content = String((m as any).content ?? "");

            if (mid === base || mid === `assistant-${base}`) return false;
            if (role === "system" && (kind2 === "stream_update" || kind2 === "text") && content.trim() === "") return false;
            if (role === "system" && (content.includes("Processing voice") || content.includes("جاري معالجة الصوت"))) return false;
            return true;
          });
          messagesRef.current = filtered;
          return filtered;
        });
        return;
      }

      setMessages((prev) => {
        const updated = [...prev];
        const idx     = updated.findIndex((m: any) => (m as any).id === id);
        const prevMsg = idx !== -1 ? (updated[idx] as any) : null;

        const next: ChatMessage = {
          ...(prevMsg || {}),
          id,
          role:    data.role,
          kind:    (kind as any) || (prevMsg?.kind ?? "text"),
          content: typeof text === "string" ? text : prevMsg?.content ?? "",
          ...(audioUrl ? { audioUrl } : {}),
        } as any;

        if (idx === -1) updated.push(next);
        else updated[idx] = next;

        messagesRef.current = updated;
        return updated;
      });
    },

    onQuotaExceeded: () => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "🚫 Daily free limit reached (3/3). Please upgrade.",
        kind: "upgrade",
      }]);
      setUpgradeOpen(true);
      limitReachedRef.current = true;
    },
  }), [
    input, loading, streaming, lang, darkMode,
    loadingUser, typedPlaceholder, sessionId,
    pendingImages, pendingDocuments,
    selected, models, modelOptions, selectModel,
    sendMessage, stopRequest,
    setSessionId, router, activeAgentId,
  ]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className={`relative min-h-screen overflow-hidden ${rootBG}`} dir="ltr">
      <div className={`pointer-events-none absolute inset-0 -z-10 opacity-45 ${overlayGrid}`} />

      <div className={`absolute inset-0 flex flex-row ${baseText}`}>
        <ChatSidebar
          darkMode={darkMode}
          open={sidebarOpen}
          onToggleThemeAction={() => setDarkMode((v) => !v)}
          onNewChatAction={handleNewChat}
          onCloseAction={() => setSidebarOpen(false)}
          isLoggedIn={isLoggedIn}
          userName={userName}
          userEmail={user?.email || null}
          onAccountClickAction={() => setAuthOpen(true)}
          sessions={sessions}
          activeSessionId={sessionId}
          onOpenSessionAction={openSession}
          onDeleteSessionAction={handleDeleteSession}
          onNewChatInFolderAction={handleNewChatInFolder}
          onRenameSessionAction={(sid) => openRenameDialog(String(sid))}
          onCopySessionLinkAction={(sid) => {
            if (typeof window !== "undefined") {
              navigator.clipboard?.writeText(
                `${window.location.origin}/qxt-chat?sid=${sid}`
              );
            }
          }}
          projectFolders={workspaceTree.folders}
          unfiledSessions={workspaceTree.unfiled}
          onCreateProjectFolderAction={(title) => handleCreateProjectFolder(title)}
          onMoveSessionToFolderAction={handleMoveSessionToFolder}
          onReorderFolderSessionsAction={handleReorderFolderSessions}
          workspaceBusy={workspaceBusy}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <ChatHeader
            conversationId={sessionId}
            sessionTitle={activeSessionTitle}
            sessionKind="chat"
            apiVersion="v1"
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onCopyLink={() => {
              if (typeof window !== "undefined" && sessionId) {
                navigator.clipboard?.writeText(
                  `${window.location.origin}/qxt-chat?sid=${sessionId}`
                );
              }
            }}
            onNativeShare={async () => {
              if (typeof window === "undefined" || !sessionId) return;
              const url = `${window.location.origin}/qxt-chat?sid=${sessionId}`;
              if (navigator.share) await navigator.share({ url, title: "ChatQXT" });
              else await navigator.clipboard?.writeText(url);
            }}
            onRenameSession={() => {
              if (sessionId) openRenameDialog(String(sessionId));
            }}
            onDeleteSession={() => {
              if (sessionId) handleDeleteSession(String(sessionId));
            }}
          />

          <main className={`flex-1 overflow-y-auto px-3 py-4 ${composerMode === "bottom" ? DOCK_PB : "pb-10"} ${scrollClasses}`}>
            <div className={contentWrap}>
              {!conversationStarted ? (
                <div className="min-h-[calc(100vh-260px)] flex flex-col items-center justify-center text-center gap-5">
                  <div>
                    <h1 className={`text-2xl font-semibold mb-2 ${darkMode ? "text-emerald-100" : "text-cyan-50"}`}>
                      {welcomeTitle}
                    </h1>
                    <p className={`text-sm max-w-xl mx-auto ${darkMode ? "text-emerald-200/80" : "text-cyan-100/80"}`}>
                      {welcomeBody}
                    </p>
                  </div>
                  <div className="w-full">
                    <ChatFooter {...footerProps} />
                  </div>
                </div>
              ) : (
                <ChatMessages
                  messages={messages}
                  lang={lang}
                  assistantName={assistantName}
                  darkMode={darkMode}
                  messageDir={messageDir}
                  messageTextAlign={messageTextAlign}
                  copiedIndex={copiedIndex}
                  reactions={reactions}
                  expandedMsgs={expandedMsgs}
                  setExpandedMsgs={setExpandedMsgs}
                  editingIndex={editingIndex}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  cancelEdit={cancelEdit}
                  saveEdit={saveEdit}
                  startEdit={startEdit}
                  handleCopy={handleCopy}
                  handleReaction={handleReaction}
                  handleShare={handleShare}
                  handleReport={handleReport}
                  isLongText={isLongText}
                  clampText={clampText}
                  busy={busy}
                  streaming={streaming}
                  pendingStage={pendingStage}
                  stageHistory={stageHistory}
                  bottomRef={bottomRef}
                />
              )}
            </div>
          </main>

          {conversationStarted && (
            <div className="sticky bottom-4 z-50 w-full flex justify-center">
              <div className="w-full max-w-[740px] px-4">
                <ChatFooter {...footerProps} />
              </div>
            </div>
          )}

          <PersonalUpgradeModal
            open={upgradeOpen}
            onClose={() => setUpgradeOpen(false)}
            onUpgrade={async (planId) => {
              const res = await fetch(`${API_BASE}/api/v1/billing/subscribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ plan_id: planId }),
              });
              const data = await res.json();
              if (data?.checkout_url) window.location.href = data.checkout_url;
            }}
          />

          <RenameDialog
            open={renameOpen}
            darkMode={darkMode}
            renameDraft={renameDraft}
            setRenameDraftAction={setRenameDraft}
            closeRenameDialogAction={closeRenameDialog}
            submitRenameDialogAction={submitRenameDialog}
          />

          <AuthModal
            open={authOpen}
            onClose={() => setAuthOpen(false)}
            lang={lang}
          />
        </div>
      </div>
    </div>
  );
}