"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";

import { API_BASE } from "../lib/config";
import { getStoredToken } from "../lib/api/core/qxtClient";

import type { AgentRuntime } from "../types/agent";
import type { ChatMessage } from "../types/chat";

type UseChatStreamParams = {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  messagesRef: React.MutableRefObject<ChatMessage[]>;
  isMountedRef: React.MutableRefObject<boolean>;
  sendingRef: React.MutableRefObject<boolean>;
  limitReachedRef: React.MutableRefObject<boolean>;
  ensureSession: () => Promise<string>;
  startPendingStage: () => void;
  stopPendingStage: () => void;
  setAuthOpen: React.Dispatch<React.SetStateAction<boolean>>;
  agentRuntime?: AgentRuntime;
  selectedModelId?: string | null;
  models: Array<any>;
  activeAgentId: string | null;
  activeWorkspaceId: string | null;
  activeSpaceType: string;
  onCodeStreamAction?: (code: string | null, language: string) => void;
};

export function useChatStream({
  input,
  setInput,
  setMessages,
  messagesRef,
  isMountedRef,
  sendingRef,
  limitReachedRef,
  ensureSession,
  startPendingStage,
  stopPendingStage,
  setAuthOpen,
  agentRuntime,
  selectedModelId,
  models,
  activeAgentId,
  activeWorkspaceId,
  activeSpaceType,
  onCodeStreamAction,
}: UseChatStreamParams) {
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");

  const abortRef = useRef<AbortController | null>(null);

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

      const finalModel =
        payload?.model || agentRuntime?.model || selectedModelId;

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

              // ✅ الباك اند ممكن يبعت delta.content كـ string عادي أو
              // كـ array بصيغة [{"type":"text","text":"..."}] (multimodal
              // content parts) — نطبّعها لـ string هنا، في نقطة الدخول
              // الوحيدة، عشان كل حاجة بعد كده في الابلكيشن (messages state,
              // ChatMinimap, ChatMessages...) تتعامل مع content كـ string
              // بسيط دايمًا، بدل ما نرقّع كل نقطة استهلاك على حدة.
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

              fullText += delta;
              setStreamText(fullText);

              if (onCodeStreamAction) {
                const fenceMatches = fullText.match(/```/g);
                const fenceCount = fenceMatches ? fenceMatches.length : 0;
                if (fenceCount % 2 === 1) {
                  const lastFenceIdx = fullText.lastIndexOf("```");
                  const afterFence = fullText.slice(lastFenceIdx + 3);
                  const firstNewline = afterFence.indexOf("\n");
                  const language = firstNewline === -1
                    ? afterFence.trim()
                    : afterFence.slice(0, firstNewline).trim();
                  const codeSoFar = firstNewline === -1 ? "" : afterFence.slice(firstNewline + 1);
                  onCodeStreamAction(codeSoFar, language || "plaintext");
                } else if (fenceCount > 0 && fenceCount % 2 === 0) {
                  onCodeStreamAction(null, "");
                }
              }

              if (!assistantAdded) {
                assistantAdded = true;
                setMessages((prev) => {
                  const newMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: delta,
                    kind: "text",
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
      agentRuntime,
      selectedModelId,
      models,
      ensureSession,
      startPendingStage,
      stopPendingStage,
      activeSpaceType,
      activeWorkspaceId,
      activeAgentId,
      setInput,
      setMessages,
      messagesRef,
      isMountedRef,
      sendingRef,
      limitReachedRef,
      setAuthOpen,
    ]
  );

  return {
    loading,
    streaming,
    streamText,
    stopRequest,
    sendMessage,
    abortRef,
  };
}