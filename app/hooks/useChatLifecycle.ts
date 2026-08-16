"use client";

import {
  useCallback,
  useEffect,
} from "react";

import { getStoredToken } from "../lib/api/core/qxtClient";
import { getChatRoute } from "../lib/runtime/getChatRoute";

import type { ChatMessage } from "../types/chat";

type UseChatLifecycleParams = {
  isLoggedIn: boolean;
  loadingUser: boolean;
  activeSpaceType: "personal" | "workspace";
  activeWorkspaceId: string | null;
  runtimeAgentId: string | null;
  activeAgentId: string | null;

  router: {
    replace: (href: string) => void;
  };

  setInput: React.Dispatch<React.SetStateAction<string>>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  setStreamText: React.Dispatch<React.SetStateAction<string>>;
  setPendingImages: React.Dispatch<
    React.SetStateAction<
      Array<{ url: string; preview: string; type: "image" | "video" }>
    >
  >;
  setPendingDocuments: React.Dispatch<
    React.SetStateAction<
      Array<{ url: string; name: string; size?: number; mimeType?: string }>
    >
  >;

  setSessionId: (sid: string | null) => void;
  clearActiveSession: () => void;

  limitReachedRef: React.MutableRefObject<boolean>;
  hydratedRef: React.MutableRefObject<boolean>;
  hydratingSessionRef: React.MutableRefObject<string | null>;
  prevRuntimeKeyRef: React.MutableRefObject<string | null>;
  isMountedRef: React.MutableRefObject<boolean>;
  abortRef: React.MutableRefObject<AbortController | null>;

  stopRequest: () => void;
  refreshSessions: () => Promise<any[]>;
  refreshWorkspace: () => Promise<void>;
};

export function useChatLifecycle({
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
}: UseChatLifecycleParams) {
  const resetChatState = useCallback(
    (opts?: { clearSession?: boolean; clearComposer?: boolean }) => {
      const clearSession = opts?.clearSession ?? true;
      const clearComposer = opts?.clearComposer ?? true;

      stopRequest();
      setMessages([]);
      setStreaming(false);
      setStreamText("");
      setPendingImages([]);
      setPendingDocuments([]);
      limitReachedRef.current = false;
      hydratedRef.current = false;
      hydratingSessionRef.current = null;

      if (clearComposer) {
        setInput("");
      }

      if (clearSession) {
        setSessionId(null);
      }
    },
    [
      stopRequest,
      setMessages,
      setStreaming,
      setStreamText,
      setPendingImages,
      setPendingDocuments,
      setInput,
      setSessionId,
      limitReachedRef,
      hydratedRef,
      hydratingSessionRef,
    ]
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [abortRef, isMountedRef]);

  useEffect(() => {
    if (isLoggedIn) return;

    resetChatState();

    router.replace(
      getChatRoute({
        sessionId: null,
        agentId: activeAgentId,
      })
    );
  }, [isLoggedIn, resetChatState, router, activeAgentId]);

  useEffect(() => {
    if (loadingUser) return;

    const runtimeKey = runtimeAgentId
      ? `agent:${runtimeAgentId}`
      : activeSpaceType === "workspace" && activeWorkspaceId
        ? `workspace:${activeWorkspaceId}`
        : "personal";

    // Initial hydration establishes the current runtime.
    // It is not treated as a user-initiated runtime switch.
    if (prevRuntimeKeyRef.current === null) {
      prevRuntimeKeyRef.current = runtimeKey;
      return;
    }

    if (prevRuntimeKeyRef.current === runtimeKey) return;

    prevRuntimeKeyRef.current = runtimeKey;

    const token = getStoredToken();
    if (!token) return;

    // Stop work belonging to the runtime that is being left.
    stopRequest();

    // Reset only the visible chat state.
    setMessages([]);
    setStreaming(false);
    setStreamText("");
    setPendingImages([]);
    setPendingDocuments([]);

    limitReachedRef.current = false;
    hydratedRef.current = false;
    hydratingSessionRef.current = null;

    // Important: close the displayed session without deleting
    // that runtime's remembered last-session localStorage key.
    clearActiveSession();

    router.replace(
      getChatRoute({
        sessionId: null,
        agentId: runtimeAgentId || null,
      })
    );

    // Queries are runtime-scoped, so refresh against the newly
    // selected Personal / Workspace / Agent context.
    void refreshSessions();
    void refreshWorkspace();
  }, [
    activeSpaceType,
    activeWorkspaceId,
    runtimeAgentId,
    loadingUser,
    router,
    stopRequest,
    setMessages,
    setStreaming,
    setStreamText,
    setPendingImages,
    setPendingDocuments,
    clearActiveSession,
    refreshSessions,
    refreshWorkspace,
    limitReachedRef,
    hydratedRef,
    hydratingSessionRef,
    prevRuntimeKeyRef,
  ]);

  return {
    resetChatState,
  };
}