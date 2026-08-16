"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWorkspaceTree, normalizeWorkspaceTree } from "@/app/lib/api/chat/sessionWorkspace";
import { getStoredToken, getStoredContext } from "@/app/lib/api/core/qxtClient";
import type { WorkspaceTree } from "@/app/types/workspace";

const EMPTY_TREE: WorkspaceTree = { folders: [], unfiled: [] };

// Same scoping idea as sessionsQueryKey — Personal/Workspace/Agent
// each get their own cached tree, so switching between them doesn't
// require a fresh fetch if the data is still within staleTime.
export function workspaceTreeQueryKey(scope: {
  spaceType: string;
  workspaceId?: string | null;
  agentId?: string | null;
}) {
  return ["workspaceTree", scope.spaceType, scope.workspaceId ?? null, scope.agentId ?? null] as const;
}

export function useWorkspaceTreeQuery(activeAgentId: string | null) {
  const runtime = getStoredContext();

  const scope = {
    spaceType: runtime.spaceType,
    workspaceId: runtime.spaceType === "workspace" ? runtime.workspaceId : null,
    agentId: activeAgentId,
  };

  const query = useQuery({
    queryKey: workspaceTreeQueryKey(scope),
    queryFn: async () => {
      const tree = await fetchWorkspaceTree({ agentId: activeAgentId });
      return normalizeWorkspaceTree(tree);
    },
    enabled: !!getStoredToken(),
    // Folders/projects change less often than the plain chats list —
    // a create/rename/move/reorder always calls invalidate anyway, so
    // this only affects how "eager" background refetches are.
    staleTime: 10_000,
  });

  return {
    workspaceTree: query.data ?? EMPTY_TREE,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// 🔥 Same fix as useInvalidateSessions: wrap in useCallback so this
// function's identity stays stable across renders. Without it, any
// caller that lists this in a useCallback dependency array (like
// refreshWorkspace below) would get a new identity every render,
// which can retrigger effects that depend on it — the same class of
// infinite-loop bug we hit and fixed for sessions.
export function useInvalidateWorkspaceTree() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["workspaceTree"] });
  }, [queryClient]);
}