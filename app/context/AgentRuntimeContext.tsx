"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getStoredContext, setStoredContext } from "../lib/api/core/qxtClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpaceType = "personal" | "workspace";

export type RuntimeContextValue = {
  spaceType:         SpaceType;
  activeWorkspaceId: string | null;
  activeAgentId:     string | null;
  activeAgentName:   string | null;  // ✅ React state only - not persisted
  initialized:       boolean;

  setSpaceType:         (value: SpaceType) => void;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  setActiveAgentId:     (agentId: string | null, agentName?: string | null) => void; // ✅ agentName optional
  switchToPersonal:     () => void;
  switchToWorkspace:    (workspaceId: string) => void;
  clearActiveAgent:     () => void;
  hydrateFromStorage:   () => void;
};

type StoredRuntimeContext = {
  spaceType?:    SpaceType;
  workspaceId?:  string | null;
  activeAgentId?: string | null;
  // backward compat
  scopeType?:    "personal" | "workspace" | "agent";
  agentId?:      string | null;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AgentRuntimeContext = createContext<RuntimeContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStoredRuntime(raw: StoredRuntimeContext | null | undefined): {
  spaceType:         SpaceType;
  activeWorkspaceId: string | null;
  activeAgentId:     string | null;
} {
  if (!raw) return { spaceType: "personal", activeWorkspaceId: null, activeAgentId: null };

  const spaceType: SpaceType =
    raw.spaceType || (raw.scopeType === "workspace" ? "workspace" : "personal");

  return {
    spaceType,
    activeWorkspaceId: raw.workspaceId  ?? null,
    activeAgentId:     raw.activeAgentId ?? raw.agentId ?? null,
  };
}

// ✅ activeAgentName مش بيتحفظ في localStorage - React state بس
function persistRuntime(params: {
  spaceType:         SpaceType;
  activeWorkspaceId: string | null;
  activeAgentId:     string | null;
}) {
  setStoredContext({
    spaceType:     params.spaceType,
    workspaceId:   params.activeWorkspaceId,
    activeAgentId: params.activeAgentId,
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AgentRuntimeProvider({ children }: { children: React.ReactNode }) {
  const [spaceType,         setSpaceTypeState]         = useState<SpaceType>("personal");
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [activeAgentId,     setActiveAgentIdState]     = useState<string | null>(null);
  const [activeAgentName,   setActiveAgentNameState]   = useState<string | null>(null); // ✅ React only
  const [initialized,       setInitialized]            = useState(false);

  // ── Hydrate ─────────────────────────────────────────────────────────────────

  const hydrateFromStorage = useCallback(() => {
    const stored     = getStoredContext();
    const normalized = normalizeStoredRuntime(stored);

    setSpaceTypeState(normalized.spaceType);
    setActiveWorkspaceIdState(normalized.activeWorkspaceId);
    setActiveAgentIdState(normalized.activeAgentId);
    setActiveAgentNameState(null); // ✅ اسم الـ agent مش محفوظ - هيتجيب من الـ API
    setInitialized(true);

    persistRuntime(normalized);
  }, []);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const setSpaceType = useCallback((value: SpaceType) => {
    const nextWorkspaceId = value === "workspace" ? activeWorkspaceId : null;
    if (value !== "workspace") setActiveWorkspaceIdState(null);
    setSpaceTypeState(value);
    persistRuntime({ spaceType: value, activeWorkspaceId: nextWorkspaceId, activeAgentId });
  }, [activeWorkspaceId, activeAgentId]);

  const setActiveWorkspaceId = useCallback((workspaceId: string | null) => {
    const nextSpaceType: SpaceType = workspaceId ? "workspace" : "personal";
    setSpaceTypeState(nextSpaceType);
    setActiveWorkspaceIdState(workspaceId);
    persistRuntime({ spaceType: nextSpaceType, activeWorkspaceId: workspaceId, activeAgentId });
  }, [activeAgentId]);

  // ✅ agentName اختياري - بيتحفظ في React state بس مش في localStorage
  const setActiveAgentId = useCallback((
    agentId:    string | null,
    agentName?: string | null,
  ) => {
    setActiveAgentIdState(agentId);
    setActiveAgentNameState(agentName ?? null);
    persistRuntime({ spaceType, activeWorkspaceId, activeAgentId: agentId });
  }, [spaceType, activeWorkspaceId]);

  const switchToPersonal = useCallback(() => {
    setSpaceTypeState("personal");
    setActiveWorkspaceIdState(null);
    setActiveAgentIdState(null);
    setActiveAgentNameState(null);
    persistRuntime({ spaceType: "personal", activeWorkspaceId: null, activeAgentId: null });
  }, []);

  const switchToWorkspace = useCallback((workspaceId: string) => {
    setSpaceTypeState("workspace");
    setActiveWorkspaceIdState(workspaceId);
    setActiveAgentIdState(null);
    setActiveAgentNameState(null);
    persistRuntime({ spaceType: "workspace", activeWorkspaceId: workspaceId, activeAgentId: null });
  }, []);

  const clearActiveAgent = useCallback(() => {
    setActiveAgentIdState(null);
    setActiveAgentNameState(null);
    persistRuntime({ spaceType, activeWorkspaceId, activeAgentId: null });
  }, [spaceType, activeWorkspaceId]);

  // ── Value ────────────────────────────────────────────────────────────────────

  const value = useMemo<RuntimeContextValue>(() => ({
    spaceType,
    activeWorkspaceId,
    activeAgentId,
    activeAgentName,
    initialized,
    setSpaceType,
    setActiveWorkspaceId,
    setActiveAgentId,
    switchToPersonal,
    switchToWorkspace,
    clearActiveAgent,
    hydrateFromStorage,
  }), [
    spaceType,
    activeWorkspaceId,
    activeAgentId,
    activeAgentName, // ✅ في الـ deps
    initialized,
    setSpaceType,
    setActiveWorkspaceId,
    setActiveAgentId,
    switchToPersonal,
    switchToWorkspace,
    clearActiveAgent,
    hydrateFromStorage,
  ]);

  return (
    <AgentRuntimeContext.Provider value={value}>
      {children}
    </AgentRuntimeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAgentRuntime(): RuntimeContextValue {
  const context = useContext(AgentRuntimeContext);
  if (!context) throw new Error("useAgentRuntime must be used within AgentRuntimeProvider");
  return context;
}