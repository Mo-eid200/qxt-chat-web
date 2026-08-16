"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listSessions } from "@/app/lib/api/chat/sessions";
import { getStoredToken, getStoredContext } from "@/app/lib/api/core/qxtClient";
import type { SessionItem } from "@/app/qxt-chat/components/sidebar/types";

// Query key includes the full runtime scope so switching
// Personal/Workspace/Agent automatically fetches (and caches)
// a separate list per scope — no manual "did the scope change?"
// checks needed anywhere.
export function sessionsQueryKey(scope: {
  spaceType: string;
  workspaceId?: string | null;
  agentId?: string | null;
}) {
  return ["sessions", scope.spaceType, scope.workspaceId ?? null, scope.agentId ?? null] as const;
}

export function useSessionsQuery(activeAgentId: string | null) {
  const runtime = getStoredContext();

  const scope = {
    spaceType: runtime.spaceType,
    workspaceId: runtime.spaceType === "workspace" ? runtime.workspaceId : null,
    agentId: activeAgentId,
  };

  const query = useQuery({
    queryKey: sessionsQueryKey(scope),
    queryFn: () => listSessions(),
    enabled: !!getStoredToken(),
    // Sessions change often (new chat, delete, rename) — keep this
    // shorter than the 30s global default so the list doesn't feel
    // stale right after an action, while still avoiding a refetch on
    // every single render.
    staleTime: 5_000,
  });

  return {
    sessions: (query.data ?? []) as SessionItem[],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// Central place every mutation (create/delete/rename/move) calls
// after it succeeds, so the sessions list and workspace tree both
// go stale and refetch together — this is what actually prevents the
// "stale folder_id" class of bug we hit earlier: any client holding
// an old sessions/workspaceTree snapshot gets invalidated the moment
// any other part of the app changes that data.
//
// 🔥 FIX: this used to return a brand-new arrow function on every
// render (no useCallback). Any consumer that memoized something
// based on this function's identity — like useChatSessions's
// `refreshSessions`, which lists `invalidateSessions` as a
// useCallback dependency — also got a new identity every render.
// That in turn made any effect depending on `refreshSessions` (see
// useChatHydration.ts's hydrate effect) re-run on every render,
// producing an infinite fetch loop that flooded the backend and
// exhausted the DB connection pool (the "QueuePool limit... timed
// out" errors). useCallback with [queryClient] as the only dep keeps
// this function's identity stable — queryClient itself is a stable
// singleton provided by QueryClientProvider.
export function useInvalidateSessions() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  }, [queryClient]);
}