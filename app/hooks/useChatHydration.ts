"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { getStoredToken } from "../lib/api/core/qxtClient";

import type { ChatMessage } from "../types/chat";

type SessionLike = {
  id: string | number;
};

type SpaceType = "personal" | "workspace";

type UseChatHydrationParams = {
  loadingUser: boolean;
  streaming: boolean;
  isVoiceActive?: boolean;

  // Current reactive runtime scope.
  activeAgentId: string | null;
  activeSpaceType: SpaceType;
  activeWorkspaceId: string | null;

  sendingRef: React.MutableRefObject<boolean>;
  hydratedRef: React.MutableRefObject<boolean>;
  hydratingSessionRef: React.MutableRefObject<string | null>;
  isMountedRef: React.MutableRefObject<boolean>;

  refreshSessions: () => Promise<SessionLike[]>;
  refreshWorkspace: () => Promise<void>;
  reloadSessionMessages: (sid: string) => Promise<void>;

  setSessionId: (sid: string | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
};

export function useChatHydration({
  loadingUser,
  streaming,
  isVoiceActive = false,

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
}: UseChatHydrationParams) {
  const sp = useSearchParams();
  const sidParam = sp.get("sid");

  /*
   * Tracks the runtime scope whose sidebar/session data has already
   * been loaded.
   *
   * Important:
   * Personal, every Workspace, and every Agent are independent scopes.
   */
  const initialLoadDoneForScopeRef = useRef<string | null>(null);

  const scopeKey = activeAgentId
    ? `agent:${activeAgentId}`
    : activeSpaceType === "workspace" && activeWorkspaceId
      ? `workspace:${activeWorkspaceId}`
      : "personal";

  // ────────────────────────────────────────────────────────────────────────────
  // Runtime-scope hydration
  // ────────────────────────────────────────────────────────────────────────────
  //
  // Refresh the sessions/sidebar data whenever the actual runtime changes:
  //
  // personal
  // workspace:<id>
  // agent:<id>
  //
  // Merely opening another session inside the SAME runtime does not trigger
  // these requests again.
  //
  useEffect(() => {
    if (
      loadingUser ||
      streaming ||
      sendingRef.current ||
      isVoiceActive
    ) {
      return;
    }

    const token = getStoredToken();
    if (!token) return;

    if (initialLoadDoneForScopeRef.current === scopeKey) {
      return;
    }

    let cancelled = false;

    async function loadScope() {
      try {
        await Promise.all([
          refreshSessions(),
          refreshWorkspace(),
        ]);

        if (cancelled || !isMountedRef.current) {
          return;
        }

        initialLoadDoneForScopeRef.current = scopeKey;
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[useChatHydration] scope hydration failed:",
            scopeKey,
            err
          );
        }
      }
    }

    void loadScope();

    return () => {
      cancelled = true;
    };
  }, [
    loadingUser,
    streaming,
    isVoiceActive,
    scopeKey,
    refreshSessions,
    refreshWorkspace,
    sendingRef,
    isMountedRef,
  ]);

  // ────────────────────────────────────────────────────────────────────────────
  // Active-session hydration
  // ────────────────────────────────────────────────────────────────────────────
  //
  // The URL is the source of truth for the session CURRENTLY displayed.
  //
  // /qxt-chat
  //      -> neutral screen
  //
  // /qxt-chat?sid=123
  //      -> load session 123
  //
  // We intentionally DO NOT restore a global last-session value here.
  // Runtime persistence and visible-session state are separate concerns.
  //
  // This is especially important when switching:
  //
  // Personal -> Workspace
  // Workspace A -> Workspace B
  // Workspace -> Personal
  // Agent A -> Agent B
  //
  // A runtime switch must land on the neutral chat screen rather than
  // accidentally reopening the session belonging to the previous runtime.
  //
  useEffect(() => {
    if (
      loadingUser ||
      streaming ||
      sendingRef.current ||
      isVoiceActive
    ) {
      return;
    }

    const token = getStoredToken();
    if (!token) return;

    const requestedSid = sidParam?.trim() || null;

    if (
      hydratedRef.current &&
      hydratingSessionRef.current === String(requestedSid ?? "")
    ) {
      return;
    }

    let cancelled = false;

    async function hydrateSession() {
      try {
        // No sid in URL = neutral chat screen.
        if (!requestedSid) {
          if (cancelled || !isMountedRef.current) {
            return;
          }

          /*
           * NOTE:
           * setSessionId(null) may also clear the remembered scoped session
           * depending on useChatSessions implementation.
           *
           * At runtime-switch time useChatLifecycle already calls
           * clearActiveSession(), which preserves that remembered value.
           *
           * Here we only synchronize the visible state with the neutral URL.
           */
          setMessages([]);
          hydratingSessionRef.current = null;
          hydratedRef.current = true;

          return;
        }

        hydratingSessionRef.current = requestedSid;

        setSessionId(requestedSid);

        await reloadSessionMessages(requestedSid);

        if (cancelled || !isMountedRef.current) {
          return;
        }

        hydratedRef.current = true;
      } catch (err) {
        /*
         * Do not leave the hydration guard stuck on a session that failed
         * to load. This allows a later retry/navigation to work normally.
         */
        if (!cancelled) {
          hydratingSessionRef.current = null;
          hydratedRef.current = false;
        }

        if (process.env.NODE_ENV === "development") {
          console.error(
            "[useChatHydration] session hydration failed:",
            requestedSid,
            err
          );
        }
      }
    }

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [
    loadingUser,
    sidParam,
    streaming,
    isVoiceActive,

    // Runtime changes must re-evaluate session hydration even when
    // the URL happens to remain /qxt-chat.
    scopeKey,

    sendingRef,
    hydratedRef,
    hydratingSessionRef,
    isMountedRef,

    reloadSessionMessages,
    setSessionId,
    setMessages,
  ]);
}