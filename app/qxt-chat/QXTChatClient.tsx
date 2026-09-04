"use client";
import dynamic from "next/dynamic";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  JSX,
} from "react";
import { useRouter } from "next/navigation";

import { ChatHeader } from "./components/ChatHeader";
import ChatSidebar from "./components/sidebar/ChatSidebar";
import { ChatFooter } from "./components/ChatFooter";
import { WelcomeBubbles } from "./components/WelcomeBubbles";

import ChatMessages from "./components/ChatMessages";

import { API_BASE } from "../lib/config";
import { getStoredToken } from "../lib/api/core/qxtClient";

import { useAuth } from "../context/AuthContext";
import { useModels } from "../context/ModelsContext";
import { useAgentRuntime } from "../context/AgentRuntimeContext";
import { ChatMinimap } from "./components/ChatMinimap";

import { getChatRoute } from "../lib/runtime/getChatRoute";
import { useChatSessions } from "../hooks/useChatSessions";
import { usePendingStages } from "../hooks/usePendingStages";
import { useChatMessageActions } from "../hooks/useChatMessageActions";
import { useChatHydration } from "../hooks/useChatHydration";
import { useTypingPlaceholder } from "../hooks/useTypingPlaceholder";
import { useChatScrollBehavior } from "../hooks/useChatScrollBehavior";
import { useChatRuntimeScope } from "../hooks/useChatRuntimeScope";
import { useSessionShareActions } from "../hooks/useSessionShareActions";
import { useVoiceMessageSync } from "../hooks/useVoiceMessageSync";
import { useChatLifecycle } from "../hooks/useChatLifecycle";
import { useSessionAttachments } from "../hooks/useSessionAttachments";
import { CodePanel } from "./components/CodePanel";
import type { AgentRuntime } from "../types/agent";
import type { ChatMessage } from "../types/chat";

import RenameDialog from "./components/RenameDialog";
import DeleteSessionDialog from "./components/DeleteSessionDialog";



export default function QXTChatClient({
  agentRuntime,
}: {
  agentRuntime?: AgentRuntime;
}) {
  return <QXTChatInner agentRuntime={agentRuntime} />;
}

  const AuthModal = dynamic(() => import("./components/AuthModal"), {
  ssr: false,
  });
  const PersonalUpgradeModal = dynamic(
     () => import("./components/PersonalUpgradeModal").then((m) => m.PersonalUpgradeModal),
     { ssr: false }
   );

function QXTChatInner({ agentRuntime }: { agentRuntime?: AgentRuntime }) {
  const router = useRouter();

  const { user, loadingUser, logout } = useAuth();
  const isLoggedIn = !!user;


  const { selected, models, selectModel } = useModels();
  const {
  spaceType: runtimeSpaceType,
  activeWorkspaceId: runtimeWorkspaceId,
  activeAgentId: runtimeAgentId,
  activeAgentName: runtimeAgentName,
} = useAgentRuntime();


  const {
  activeAgentId,
  activeWorkspaceId,
  activeSpaceType,
} = useChatRuntimeScope({
  agentRuntime,
  runtimeAgentId,
  runtimeWorkspaceId,
  runtimeSpaceType,
});

  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  // ✅ Live code-panel streaming refs. bubbleFullTextRef holds the
  // chat-bubble text with any open/streaming code block EXCLUDED
  // (only the panel gets that content) — reset at the start of each
  // new assistant turn. The others track fence-parsing state across
  // deltas without re-scanning the whole accumulated text each time.
  const bubbleFullTextRef = useRef("");
  const codeStreamActiveRef = useRef(false);
  const codeStreamLangBufferRef = useRef("");
  const codeStreamLangDoneRef = useRef(false);
  const codeStreamBodyRef = useRef("");
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [pendingImages, setPendingImages] = useState<
    Array<{ url: string; preview: string; type: "image" | "video" }>
  >([]);
  const [pendingDocuments, setPendingDocuments] = useState<
    Array<{ url: string; name: string; size?: number; mimeType?: string }>
  >([]);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  const sendingRef = useRef(false);
  const limitReachedRef = useRef(false);
  const isMountedRef = useRef(true);
  const hydratedRef = useRef(false);
  const hydratingSessionRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevRuntimeKeyRef = useRef<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const {
    copySessionLink,
    shareSessionLink,
  } = useSessionShareActions();

  const { handleVoiceMessage } = useVoiceMessageSync({
    setMessages,
    messagesRef,
  });

  const {
  pendingStage,
  pendingDetail,
  startPendingStage,
  updatePendingStage,
  stopPendingStage,
} = usePendingStages();

  const {
    copiedIndex,
    reactions,
    expandedMsgs,
    setExpandedMsgs,
    editingIndex,
    editingText,
    setEditingText,
    handleCopy,
    handleReaction,
    handleShare,
    handleReport,
    startEdit,
    cancelEdit,
    saveEdit,
    isLongText,
    clampText,
  } = useChatMessageActions(setMessages);

  const conversationStarted = useMemo(
    () => messages.length > 0 || streaming || streamText.length > 0,
    [messages, streaming, streamText]
  );

  const { bottomRef, shouldDockBottom } = useChatScrollBehavior({
    messages,
    streaming,
  });

  const { typedPlaceholder } = useTypingPlaceholder({
    conversationStarted,
  });

  // Backend doesn't have a "list session attachments" endpoint yet —
  // this derives the Files-panel list straight from the in-memory
  // messages array instead. See ChatHeader.tsx's FilesPanel TODO.
  const sessionAttachments = useSessionAttachments(messages);
  
  const [codePanel, setCodePanel] = useState<{ code: string; language: string } | null>(null);
  const [codePanelWidth, setCodePanelWidth] = useState(40); // percent

  const handleOpenCodePanel = useCallback((code: string, language: string) => {
    setCodePanel({ code, language });
  }, []);

  const handleCloseCodePanel = useCallback(() => {
    setCodePanel(null);
  }, []);

  const busy = loading || streaming || !!pendingStage;
  const composerMode = shouldDockBottom ? "bottom" : "center";
  const isAr = lang === "ar";
  const assistantName = "Quarc";
  const messageDir = isAr ? "rtl" : "ltr";
  const messageTextAlign = isAr ? "text-right" : "text-left";

  const userName =
    (user as any)?.full_name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    null;

  const rootBG = "bg-[#0a0a0b]";
  const overlayGrid =
    "bg-[radial-gradient(circle_at_top,_var(--accent-hover),_transparent_55%)]";
  const baseText = "text-white/90";
  const scrollClasses = "qxt-scroll scroll-smooth";
  const welcomeTitle = "Welcome to Chat-QXT";
  const welcomeBody =
    "Start by typing any idea, question, or project you'd like us to work on together.";

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

  const {
  sessionId,
  setSessionId,
  clearActiveSession,

  sessions,
  workspaceTree,
  workspaceBusy,

  renameOpen,
  renameDraft,
  renameBusy,
  setRenameDraft,

  deleteOpen,
  deleteTitle,
  deleteBusy,
  closeDeleteDialog,
  confirmDeleteSession,

  reloadSessionMessages,
  refreshSessions,
  refreshWorkspace,
  openSession,
  handleDeleteSession,
  handleTogglePin,
  handleToggleStar,
  handleToggleUnread,
  handleNewChatInFolder,
  handleNewChat,
  openRenameDialog,
  closeRenameDialog,
  submitRenameDialog,
  ensureSession,
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

useChatHydration({
  loadingUser,
  isVoiceActive,
  streaming,

  activeAgentId,
  activeSpaceType,
  activeWorkspaceId,

  sendingRef,
  hydratedRef,
  hydratingSessionRef,
  isMountedRef,

  refreshSessions,
  refreshWorkspace,
  reloadSessionMessages,

  setSessionId,
  setMessages,
});

  const { resetChatState } = useChatLifecycle({
    isLoggedIn,
    loadingUser,
    activeSpaceType,
    activeWorkspaceId,
    runtimeAgentId,
    activeAgentId,
    router,
    setInput,
    setMessages,
    setStreaming,
    setStreamText,
    setPendingImages,
    setPendingDocuments,
    setSessionId,
    clearActiveSession,
    limitReachedRef,
    hydratedRef,
    hydratingSessionRef,
    prevRuntimeKeyRef,
    isMountedRef,
    abortRef,
    stopRequest,
    refreshSessions,
    refreshWorkspace,
  });

  const activeSessionTitle = useMemo(() => {
    if (!sessionId) return null;
    return (
      sessions.find((s) => String(s.id) === String(sessionId))?.title ?? null
    );
  }, [sessions, sessionId]);

  const activeSession = useMemo(() => {
  if (!sessionId) return null;

  return (
    sessions.find(
      (s) => String(s.id) === String(sessionId)
    ) ?? null
  );
}, [sessions, sessionId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(
    async (payload?: {
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
      const hasImages = !!payload?.images?.length;
      const hasFiles = !!payload?.files?.length;

      if (
        (!userMessage && !hasImages && !hasFiles) ||
        loading ||
        streaming ||
        limitReachedRef.current
      ) {
        return;
      }

      const token = getStoredToken();
      if (!token) {
        setAuthOpen(true);
        return;
      }

      if (!models.length) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⏳ Models are still loading, try again in a second.",
            kind: "text",
          },
        ]);
        return;
      }

      const finalModel = payload?.model || agentRuntime?.model || selected?.id;
      if (!finalModel) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ No model selected.",
            kind: "text",
          },
        ]);
        return;
      }

      sendingRef.current = true;
      setInput("");
      setLoading(true);
      setStreamText("");
      setStreaming(true);
      startPendingStage();

      try {
        const newUserMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: userMessage,
          kind: hasFiles ? "document" : hasImages ? "image" : "text",
          images: hasImages ? payload?.images : undefined,
          documents: hasFiles ? payload?.files : undefined,
        };

        setMessages((prev) => {
          const updated = [...prev, newUserMsg];
          messagesRef.current = updated;
          return updated;
        });

        const sid = await ensureSession();
        if (!sid) throw new Error("Session creation failed");

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const updatedMessages: ChatMessage[] = payload?.injectedMessage
          ? [...messagesRef.current, payload.injectedMessage]
          : [...messagesRef.current];

        const cleanMessages = updatedMessages
          .filter(
            (m) =>
              m?.role &&
              ["user", "assistant", "system"].includes(m.role) &&
              (
                (m.content && String(m.content).trim().length > 0) ||
                (m.images && m.images.length > 0) ||
                (m.documents && m.documents.length > 0)
              )
          )
          .map((m) => {
            const hasMedia = !!(m.images?.length || m.documents?.length);

            const mapped: any = {
              role: m.role,
              content: String(m.content ?? ""),
            };

            if (hasMedia) {
              mapped.payload = {
                images: m.images || [],
                videos: m.videos || [],
                documents: m.documents || [],
                audio_url: m.audioUrl || null,
              };
            }

            return mapped;
          });

        const requestPayload = {
          model: finalModel,
          session_id: sid,
          messages: [
            ...(agentRuntime?.systemPrompt
              ? [{ role: "system", content: agentRuntime.systemPrompt }]
              : []),
            ...cleanMessages.slice(-20),
          ],
          stream: true,
        };

        const workspaceId =
          activeSpaceType === "workspace"
            ? activeWorkspaceId
            : null;

        const response = await fetch(`${API_BASE}/api/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Space-Type": activeSpaceType,
            "X-Scope-Type": activeSpaceType,
            ...(workspaceId ? { "X-Workspace-ID": workspaceId } : {}),
            ...(activeAgentId ? { "X-Agent-ID": activeAgentId } : {}),
          },
          signal: abortRef.current.signal,
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const raw = await response.clone().text();
          throw new Error(raw || `API error ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let fullText = "";
        let assistantAdded = false;

        // ✅ Reset per-turn code-streaming state — otherwise a
        // previous message's leftover buffer/flags would bleed into
        // this new one.
        bubbleFullTextRef.current = "";
        codeStreamActiveRef.current = false;
        codeStreamLangBufferRef.current = "";
        codeStreamLangDoneRef.current = false;
        codeStreamBodyRef.current = "";

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
              const json = JSON.parse(data);
              const status = json?.choices?.[0]?.delta?.status;
              if (status?.stage) {
                updatePendingStage(status.stage, status.detail);
                continue;
              }

              const images =
                json?.choices?.[0]?.delta?.payload?.images ||
                json?.payload?.images ||
                [];
              if (images?.length > 0) {
                setStreamText("");
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: "",
                    images,
                    kind: "image",
                    id: crypto.randomUUID(),
                  },
                ]);
                continue;
              }
              // ✅ نفس التطبيع اللي في useChatStream.ts: delta.content
              // ممكن يوصل كـ string أو كـ array [{"type":"text","text":"..."}]
              const rawDelta = json?.choices?.[0]?.delta?.content;
              const delta =
                typeof rawDelta === "string"
                  ? rawDelta
                  : Array.isArray(rawDelta)
                    ? rawDelta
                        .map((part: any) =>
                          typeof part === "string"
                            ? part
                            : typeof part?.text === "string"
                              ? part.text
                              : ""
                        )
                        .join("")
                    : "";
              if (!delta) continue;

              stopPendingStage();

              fullText += delta;
              setStreamText(fullText);

              // ✅ Live code-fence detection, O(delta) not O(fullText):
              // tracks "are we currently inside an open ``` block?" in
              // a ref instead of re-scanning the whole accumulated
              // text on every single token (that full-text regex scan
              // growing every delta was what caused the visible
              // stutter). Once inside a code block, its content is
              // streamed straight into the side panel AND excluded
              // from the chat bubble's own text — the bubble shows
              // everything up to the opening fence, then nothing
              // until the closing fence, at which point the compact
              // CodeBlock card takes over (rendered from the final
              // saved message content, same as before).
              let deltaRemaining = delta;
              let bubbleTextToAppend = "";

              while (deltaRemaining.length > 0) {
                if (!codeStreamActiveRef.current) {
                  const fenceIdx = deltaRemaining.indexOf("```");
                  if (fenceIdx === -1) {
                    bubbleTextToAppend += deltaRemaining;
                    deltaRemaining = "";
                  } else {
                    bubbleTextToAppend += deltaRemaining.slice(0, fenceIdx);
                    deltaRemaining = deltaRemaining.slice(fenceIdx + 3);
                    codeStreamActiveRef.current = true;
                    codeStreamLangBufferRef.current = "";
                    codeStreamLangDoneRef.current = false;
                    codeStreamBodyRef.current = "";
                    setCodePanel({ code: "", language: "plaintext" });
                  }
                } else {
                  const closeIdx = deltaRemaining.indexOf("```");
                  const chunk = closeIdx === -1 ? deltaRemaining : deltaRemaining.slice(0, closeIdx);

                  if (!codeStreamLangDoneRef.current) {
                    const nl = (codeStreamLangBufferRef.current + chunk).indexOf("\n");
                    if (nl === -1) {
                      codeStreamLangBufferRef.current += chunk;
                    } else {
                      const combined = codeStreamLangBufferRef.current + chunk;
                      const lang = combined.slice(0, nl).trim();
                      codeStreamBodyRef.current = combined.slice(nl + 1);
                      codeStreamLangDoneRef.current = true;
                      setCodePanel({ code: codeStreamBodyRef.current, language: lang || "plaintext" });
                    }
                  } else {
                    codeStreamBodyRef.current += chunk;
                    setCodePanel((prev) => prev ? { ...prev, code: codeStreamBodyRef.current } : prev);
                  }

                  if (closeIdx === -1) {
                    deltaRemaining = "";
                  } else {
                    deltaRemaining = deltaRemaining.slice(closeIdx + 3);
                    codeStreamActiveRef.current = false;
                  }
                }
              }

              if (bubbleTextToAppend) {
                bubbleFullTextRef.current += bubbleTextToAppend;
              }

              if (!assistantAdded) {
                assistantAdded = true;
                setMessages((prev) => {
                  const newMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: bubbleFullTextRef.current,
                    kind: "text",
                  };
                  const updated = [...prev, newMsg];
                  messagesRef.current = updated;
                  return updated;
                });
              } else if (bubbleTextToAppend) {
                setMessages((prev) => {
                  if (!prev.length) return prev;

                  const last = prev[prev.length - 1];
                  if (!last || last.role !== "assistant") return prev;

                  const updated = [
                    ...prev.slice(0, -1),
                    { ...last, content: bubbleFullTextRef.current },
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
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `❌ ${error?.message || "An error occurred"}`,
              kind: "text",
            },
          ]);
        }

        setStreaming(false);
        setStreamText("");
        stopPendingStage();
      } finally {
        sendingRef.current = false;
        setLoading(false);
      }
    },
    [
      input,
      loading,
      streaming,
      selected,
      models,
      agentRuntime,
      ensureSession,
      startPendingStage,
      stopPendingStage,
      activeSpaceType,
      activeWorkspaceId,
      activeAgentId,
    ]
  );

  const modelOptions = useMemo(
    () => models.map((m) => ({ id: m.id, label: m.public_name })),
    [models]
  );

  const CHAT_WIDTH = "max-w-[740px] w-full";
  const DOCK_PB = "pb-[280px] md:pb-[300px]";
  const contentShift = sidebarOpen ? "lg:-translate-x-8" : "";
  const contentWrap = `${CHAT_WIDTH} mx-auto transition-transform duration-300`;

  const footerProps = useMemo(
    () => ({
      input,
      loading: loading || streaming,
      lang,
      darkMode,
      placeholder: loadingUser ? "Loading session..." : typedPlaceholder,
      sessionId,
      ensureSession,
      onRecordingStateChange: setIsVoiceActive,

      onChange: (val: string) => setInput(val),

      onSend: async (data: {
        text: string;
        model: string;
        isVoiceActive?: boolean;
        images?: string[];
        files?: any[];
      }) =>
        sendMessage({
          text: data.text,
          model: data.model,
          isVoiceActive: data.isVoiceActive,
          images: data.images,
          files: data.files,
        }),

      onSessionChange: async (id: string) => {
        if (id === "NEED_SESSION") {
          resetChatState();
          router.replace(getChatRoute({ sessionId: null, agentId: activeAgentId }));
          return null;
        }

        setSessionId(id);
        router.replace(getChatRoute({ sessionId: id, agentId: activeAgentId }));
        return id;
      },

      onStop: stopRequest,
      pendingImages,
      setPendingImages,
      pendingDocuments,
      setPendingDocuments,

      selectedModel: selected
        ? {
            id: selected.id,
            label:
              models.find((m) => m.id === selected.id)?.public_name ||
              selected.id,
          }
        : null,

      models: modelOptions,
      onModelChange: (model: { id: string; label: string }) =>
        selectModel(model.id),
      onVoiceMessage: handleVoiceMessage,

      onQuotaExceeded: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "🚫 Daily free limit reached (3/3). Please upgrade.",
            kind: "upgrade",
          },
        ]);
        setUpgradeOpen(true);
        limitReachedRef.current = true;
      },
    }),
    [
      input,
      loading,
      streaming,
      lang,
      darkMode,
      loadingUser,
      typedPlaceholder,
      sessionId,
      ensureSession,
      sendMessage,
      resetChatState,
      router,
      activeAgentId,
      stopRequest,
      setPendingImages,
      setPendingDocuments,
      selected,
      models,
      modelOptions,
      selectModel,
      handleVoiceMessage,
    ]
  );

  return (
    <div className={`relative min-h-screen overflow-hidden ${rootBG}`} dir="ltr">
      <div
        className={`pointer-events-none absolute inset-0 -z-10 opacity-45 ${overlayGrid}`}
      />

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
          onLogoutAction={logout}
          sessions={sessions}
          activeSessionId={sessionId}
          onOpenSessionAction={openSession}
          onDeleteSessionAction={handleDeleteSession}
          onTogglePinAction={handleTogglePin}
          onToggleStarAction={handleToggleStar}
          onToggleUnreadAction={handleToggleUnread}
          onNewChatInFolderAction={handleNewChatInFolder}
          onRenameSessionAction={(sid) => openRenameDialog(String(sid))}
          onCopySessionLinkAction={(sid) => {
            void copySessionLink(String(sid));
          }}
          projectFolders={workspaceTree.folders}
          unfiledSessions={workspaceTree.unfiled}
          onCreateProjectFolderAction={(title) =>
            handleCreateProjectFolder(title)
          }
          onMoveSessionToFolderAction={handleMoveSessionToFolder}
          onReorderFolderSessionsAction={handleReorderFolderSessions}
          workspaceBusy={workspaceBusy}
        />

        <div className="flex flex-col min-w-0 flex-1">
          <ChatHeader
  conversationId={sessionId}
  sessionTitle={activeSessionTitle}
  starred={Boolean(activeSession?.starred)}
markedUnread={Boolean(activeSession?.marked_unread)}

onToggleStar={() => {
  if (sessionId) {
    void handleToggleStar(String(sessionId));
  }
}}

onToggleUnread={() => {
  if (sessionId) {
    void handleToggleUnread(String(sessionId));
  }
}}
  sessionKind="chat"
  apiVersion="v1"
  sidebarOpen={sidebarOpen}
  onToggleSidebar={() => setSidebarOpen((v) => !v)}
  onCopyLink={() => {
    void copySessionLink(sessionId);
  }}
  onNativeShare={async () => {
    await shareSessionLink(sessionId);
  }}
  onRenameSession={() => {
    if (sessionId) openRenameDialog(String(sessionId));
  }}
  onDeleteSession={() => {
    if (sessionId) handleDeleteSession(String(sessionId));
  }}
  activeAgentName={runtimeAgentName}
  attachmentsCount={sessionAttachments.length}
  attachments={sessionAttachments}
  projectFolders={workspaceTree.folders}
  onAddToProject={(folderId) => {
    if (sessionId) handleMoveSessionToFolder(String(sessionId), folderId);
  }}
/>

          <main
  ref={mainScrollRef}
  className={`relative flex-1 min-w-0 overflow-y-scroll ${
    conversationStarted ? `py-4 ${DOCK_PB}` : ""
  } ${scrollClasses}`}
>
  {!conversationStarted ? (
    <div className="relative flex min-h-full w-full items-center justify-center overflow-hidden px-4">
      <WelcomeBubbles />
      <div className="relative z-10 flex w-full max-w-[740px] -translate-y-[4vh] flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-white text-[28px] font-bold tracking-tight">
            {welcomeTitle}
          </h1>

          <p className="font-serif text-white/80 text-[16px] leading-relaxed tracking-tight">
            {welcomeBody}
          </p>
        </div>

        <div className="w-full">
          <ChatFooter {...footerProps} />
        </div>
      </div>
    </div>
  ) : (
    <div className={contentWrap}>
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
        pendingDetail={pendingDetail}
        bottomRef={bottomRef}
        onOpenCodePanel={handleOpenCodePanel}
      />
    </div>
  )}
</main>

{conversationStarted && (
  <div className="sticky bottom-4 z-50 w-full">
    <div
      className={
        codePanel
          ? "w-full px-4"
          : "mx-auto w-full max-w-[740px] px-4"
      }
    >
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
              if (data?.checkout_url) {
                window.location.href = data.checkout_url;
              }
            }}
          />

          <RenameDialog
  open={renameOpen}
  darkMode={darkMode}
  renameDraft={renameDraft}
  renameBusy={renameBusy}
  setRenameDraftAction={setRenameDraft}
  closeRenameDialogAction={closeRenameDialog}
  submitRenameDialogAction={submitRenameDialog}
/>

<DeleteSessionDialog
  open={deleteOpen}
  title={deleteTitle}
  busy={deleteBusy}
  darkMode={darkMode}
  onCloseAction={closeDeleteDialog}
  onConfirmAction={confirmDeleteSession}
/>

          <AuthModal
            open={authOpen}
            onClose={() => setAuthOpen(false)}
            lang={lang}
          />
        </div>
       <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{ width: codePanel ? `${codePanelWidth}%` : "0%" }}
        >
          <ChatMinimap messages={messages} containerRef={mainScrollRef} />
          
          {codePanel && (
            <CodePanel
              code={codePanel.code}
              language={codePanel.language}
              onClose={handleCloseCodePanel}
              width={codePanelWidth}
              onWidthChange={setCodePanelWidth}
            />
          )}
        </div>
      </div>
    </div>
  );
}