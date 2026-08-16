"use client";

import type { AgentRuntime } from "../types/agent";
import type { SpaceType } from "../context/AgentRuntimeContext";

type UseChatRuntimeScopeParams = {
  agentRuntime?: AgentRuntime;
  runtimeAgentId?: string | null;
  runtimeWorkspaceId?: string | null;
  runtimeSpaceType?: SpaceType;
};

export function useChatRuntimeScope({
  agentRuntime,
  runtimeAgentId,
  runtimeWorkspaceId,
  runtimeSpaceType = "personal",
}: UseChatRuntimeScopeParams) {
  const activeAgentId =
    agentRuntime?.agent?.id ||
    runtimeAgentId ||
    null;

  const activeWorkspaceId =
    runtimeSpaceType === "workspace"
      ? runtimeWorkspaceId ?? null
      : null;

  const activeSpaceType: SpaceType =
    runtimeSpaceType === "workspace"
      ? "workspace"
      : "personal";

  return {
    activeAgentId,
    activeWorkspaceId,
    activeSpaceType,
  };
}