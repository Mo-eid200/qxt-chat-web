import type { Agent, AgentRuntime } from "../../../types/agent";
import { getChatModelWithFallback }  from "../chat/models";

export type { AgentRuntime };

// ─── getChatRoute ─────────────────────────────────────────────────────────────
// ✅ مش بنبني URL للـ agent - الـ agent في AgentRuntimeContext

export function getChatRoute(sid?: string | null): string {
  if (!sid) return "/qxt-chat";
  return `/qxt-chat?sid=${encodeURIComponent(sid)}`;
}

// ─── buildAgentRuntime ────────────────────────────────────────────────────────

export async function buildAgentRuntime(agent: Agent): Promise<AgentRuntime> {
  const resolvedModel = await getChatModelWithFallback(agent.model, "chat");

  return {
    agent,
    model:         resolvedModel?.id        || "pulse-core",
    systemPrompt:  agent.system_prompt      || "",
    temperature:   typeof agent.temperature === "number" ? agent.temperature : 0.7,
    capabilities:  agent.capabilities       || [],
    memoryEnabled: Boolean(agent.memory_enabled),
  };
}