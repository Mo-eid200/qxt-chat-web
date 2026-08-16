"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { useAgentRuntime } from "./AgentRuntimeContext";

import {
  qxtApiClient,
  getStoredToken,
} from "../lib/api/core/qxtClient";

import type {
  BootstrapWorkspace,
} from "../lib/api/auth/auth.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspacePlan =
  | "Free Plan"
  | "Starter Plan"
  | "Pro Plan"
  | "Business Plan"
  | "Enterprise Plan";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "developer"
  | "member"
  | "viewer";

export type WorkspaceType =
  | "Personal"
  | "Team"
  | "Enterprise";

export type Workspace = {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
  description?: string | null;
  role: WorkspaceRole;
  type: WorkspaceType;
  plan: WorkspacePlan;
  balance: number;
  seats: number;
  projects_count: number;
  members_count: number;
  api_requests: number;
  created_at?: string;
};

type CreateWorkspacePayload = {
  name: string;
  description?: string;
};

type WorkspaceContextValue = {
  loading: boolean;
  initialized: boolean;

  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isWorkspaceMode: boolean;

  refreshWorkspaces: () => Promise<void>;

  switchWorkspace: (
    workspaceId: string
  ) => Promise<void>;

  switchToPersonal: () => void;

  createWorkspace: (
    payload: CreateWorkspacePayload
  ) => Promise<Workspace>;

  removeWorkspace: (
    workspaceId: string
  ) => Promise<void>;

  updateWorkspace: (
    workspaceId: string,
    payload: Partial<CreateWorkspacePayload>
  ) => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const WorkspaceContext =
  createContext<WorkspaceContextValue | null>(null);

// ─── Cache ────────────────────────────────────────────────────────────────────
//
// IMPORTANT:
//
// - Cache is per authenticated user.
// - Cache contains workspace display metadata only.
// - No JWT.
// - No API key.
// - No secrets.
//
// Bootstrap remains authoritative.
// Cache only improves perceived startup speed.
//

const WORKSPACES_CACHE_VERSION = "v2";
const CACHE_TTL_MS = 30 * 60_000; // 30 minutes

type WorkspacesCacheEntry = {
  version: typeof WORKSPACES_CACHE_VERSION;
  userId: string;
  workspaces: Workspace[];
  cachedAt: number;
};

function getWorkspaceCacheKey(
  userId: string
): string {
  return `qxt_workspaces_cache_${WORKSPACES_CACHE_VERSION}:${userId}`;
}

function readWorkspacesCache(
  userId: string | null
): Workspace[] | null {
  if (
    typeof window === "undefined" ||
    !userId
  ) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      getWorkspaceCacheKey(userId)
    );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as WorkspacesCacheEntry;

    if (
      parsed.version !== WORKSPACES_CACHE_VERSION ||
      parsed.userId !== userId ||
      !Array.isArray(parsed.workspaces)
    ) {
      return null;
    }

    if (
      Date.now() - parsed.cachedAt >
      CACHE_TTL_MS
    ) {
      window.localStorage.removeItem(
        getWorkspaceCacheKey(userId)
      );

      return null;
    }

    return parsed.workspaces;
  } catch {
    return null;
  }
}

function writeWorkspacesCache(
  userId: string | null,
  workspaces: Workspace[]
): void {
  if (
    typeof window === "undefined" ||
    !userId
  ) {
    return;
  }

  try {
    const entry: WorkspacesCacheEntry = {
      version: WORKSPACES_CACHE_VERSION,
      userId,
      workspaces,
      cachedAt: Date.now(),
    };

    window.localStorage.setItem(
      getWorkspaceCacheKey(userId),
      JSON.stringify(entry)
    );
  } catch {
    // Cache is a performance optimization only.
  }
}

function clearWorkspacesCache(
  userId: string | null
): void {
  if (
    typeof window === "undefined" ||
    !userId
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      getWorkspaceCacheKey(userId)
    );
  } catch {
    // Ignore cache failures.
  }
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizePlan(
  value: unknown
): WorkspacePlan {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    raw === "enterprise" ||
    raw === "enterprise plan"
  ) {
    return "Enterprise Plan";
  }

  if (
    raw === "business" ||
    raw === "business plan"
  ) {
    return "Business Plan";
  }

  if (
    raw === "pro" ||
    raw === "pro plan"
  ) {
    return "Pro Plan";
  }

  if (
    raw === "starter" ||
    raw === "starter plan"
  ) {
    return "Starter Plan";
  }

  return "Free Plan";
}

function normalizeRole(
  value: unknown
): WorkspaceRole {
  switch (
    String(value ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "owner":
      return "owner";

    case "admin":
      return "admin";

    case "developer":
      return "developer";

    case "viewer":
      return "viewer";

    default:
      return "member";
  }
}

function normalizeType(
  value: unknown
): WorkspaceType {
  switch (
    String(value ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "enterprise":
      return "Enterprise";

    case "team":
    case "workspace":
      return "Team";

    default:
      return "Personal";
  }
}

/**
 * Normalizes either:
 *
 * 1. /api/v1/bootstrap workspace shape
 * 2. legacy /api/v1/workspaces shape
 * 3. create/update workspace response
 *
 * Bootstrap fields:
 *   plan_name
 *   wallet_balance
 *   seat_limit
 *
 * Legacy frontend fields:
 *   plan
 *   balance
 *   seats
 */
function normalizeWorkspace(
  raw: Partial<BootstrapWorkspace> &
    Record<string, unknown>
): Workspace {
  return {
    id: String(raw?.id ?? ""),

    name:
      typeof raw?.name === "string" &&
      raw.name.trim()
        ? raw.name
        : "Untitled Workspace",

    slug:
      typeof raw?.slug === "string"
        ? raw.slug
        : undefined,

    logo_url:
      typeof raw?.logo_url === "string"
        ? raw.logo_url
        : null,

    description:
      typeof raw?.description === "string"
        ? raw.description
        : null,

    role: normalizeRole(raw?.role),

    type: normalizeType(raw?.type),

    plan: normalizePlan(
      raw?.plan_name ?? raw?.plan
    ),

    balance: Number(
      raw?.wallet_balance ??
      raw?.balance ??
      0
    ),

    seats: Number(
      raw?.seat_limit ??
      raw?.seats ??
      1
    ),

    projects_count: Number(
      raw?.projects_count ?? 0
    ),

    members_count: Number(
      raw?.members_count ?? 1
    ),

    api_requests: Number(
      raw?.api_requests ?? 0
    ),

    created_at:
      typeof raw?.created_at === "string"
        ? raw.created_at
        : undefined,
  };
}

function normalizeWorkspaceList(
  raw: unknown
): Workspace[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) =>
      normalizeWorkspace(
        (item ?? {}) as Partial<BootstrapWorkspace> &
          Record<string, unknown>
      )
    )
    .filter((workspace) => !!workspace.id);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const {
    user,
    bootstrap,
    authReady,
    loadingUser,
  } = useAuth();

  const {
    spaceType,
    activeWorkspaceId,
    switchToWorkspace,
    switchToPersonal: switchRuntimeToPersonal,
  } = useAgentRuntime();

  const userId =
    user?.id != null
      ? String(user.id)
      : null;

  const [workspaces, setWorkspaces] =
    useState<Workspace[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [initialized, setInitialized] =
    useState(false);

  const hydratedUserRef =
    useRef<string | null>(null);

  // ── Cache hydration ────────────────────────────────────────────────────────
  //
  // localStorage is read once when authenticated identity becomes known.
  // It gives us an immediate list while bootstrap is resolving/propagating.
  //

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!userId) {
      setWorkspaces([]);
      setLoading(false);
      setInitialized(true);
      hydratedUserRef.current = null;
      return;
    }

    if (
      hydratedUserRef.current === userId
    ) {
      return;
    }

    hydratedUserRef.current = userId;

    const cached =
      readWorkspacesCache(userId);

    if (cached) {
      setWorkspaces(cached);
    }
  }, [authReady, userId]);

  // ── Bootstrap synchronization ──────────────────────────────────────────────
  //
  // This is the normal authoritative startup path.
  //
  // NO /workspaces request is performed here.
  //

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!userId) {
      setWorkspaces([]);
      setLoading(false);
      setInitialized(true);
      return;
    }

    if (loadingUser) {
      return;
    }

    if (!bootstrap) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    const normalized =
      normalizeWorkspaceList(
        bootstrap.workspaces
      );

    setWorkspaces(normalized);

    writeWorkspacesCache(
      userId,
      normalized
    );

    setLoading(false);
    setInitialized(true);
  }, [
    authReady,
    loadingUser,
    bootstrap,
    userId,
  ]);

  // ── Active workspace synchronization ──────────────────────────────────────
  //
  // Pure local synchronization.
  //
  // Changing active workspace does NOT fetch /workspaces.
  //

  const activeWorkspace =
    useMemo<Workspace | null>(() => {
      if (
        spaceType !== "workspace" ||
        !activeWorkspaceId
      ) {
        return null;
      }

      return (
        workspaces.find(
          (workspace) =>
            String(workspace.id) ===
            String(activeWorkspaceId)
        ) ?? null
      );
    }, [
      spaceType,
      activeWorkspaceId,
      workspaces,
    ]);

  // If stored runtime points at a workspace that no longer exists,
  // recover locally without another list request.
  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (spaceType !== "workspace") {
      return;
    }

    if (!activeWorkspaceId) {
      switchRuntimeToPersonal();
      return;
    }

    if (activeWorkspace) {
      return;
    }

    if (workspaces.length > 0) {
      switchToWorkspace(
        workspaces[0].id
      );

      return;
    }

    switchRuntimeToPersonal();
  }, [
    initialized,
    spaceType,
    activeWorkspaceId,
    activeWorkspace,
    workspaces,
    switchToWorkspace,
    switchRuntimeToPersonal,
  ]);

  // ── Explicit server refresh ────────────────────────────────────────────────
  //
  // This is deliberately NOT called by an effect.
  //
  // Use only when:
  // - user explicitly refreshes
  // - server-side state may have changed externally
  // - another client/device changed memberships
  //

  const refreshWorkspaces =
    useCallback(async (): Promise<void> => {
      if (!userId) {
        setWorkspaces([]);
        setLoading(false);
        clearWorkspacesCache(userId);
        return;
      }

      const token = getStoredToken();

      if (!token) {
        setWorkspaces([]);
        setLoading(false);
        clearWorkspacesCache(userId);
        return;
      }

      try {
        setLoading(true);

        const response =
          await qxtApiClient.get(
            "/api/v1/workspaces"
          );

        const raw =
          response.data?.items ??
          response.data?.workspaces ??
          response.data ??
          [];

        const normalized =
          normalizeWorkspaceList(raw);

        setWorkspaces(normalized);

        writeWorkspacesCache(
          userId,
          normalized
        );
      } catch (error) {
        console.error(
          "❌ Failed loading workspaces",
          error
        );

        // Keep current/cache state.
        throw error;
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }, [userId]);

  // ── Switch workspace ──────────────────────────────────────────────────────

  const switchWorkspace =
    useCallback(
      async (
        workspaceId: string
      ): Promise<void> => {
        const workspace =
          workspaces.find(
            (item) =>
              String(item.id) ===
              String(workspaceId)
          ) ?? null;

        if (!workspace) {
          console.warn(
            "[Workspace] Not found:",
            workspaceId
          );

          return;
        }

        // Immediate local UI switch.
        switchToWorkspace(
          workspace.id
        );

        // Server activation is a mutation, not a list refresh.
        try {
          await qxtApiClient.post(
            `/api/v1/workspaces/${workspace.id}/activate`
          );
        } catch (error) {
          console.warn(
            "[Workspace] Activation failed",
            error
          );
        }
      },
      [
        workspaces,
        switchToWorkspace,
      ]
    );

  // ── Personal mode ─────────────────────────────────────────────────────────

  const switchToPersonal =
    useCallback((): void => {
      switchRuntimeToPersonal();
    }, [switchRuntimeToPersonal]);

  // ── Create ────────────────────────────────────────────────────────────────

  const createWorkspace =
    useCallback(
      async (
        payload: CreateWorkspacePayload
      ): Promise<Workspace> => {
        const response =
          await qxtApiClient.post(
            "/api/v1/workspaces",
            payload
          );

        const workspace =
          normalizeWorkspace(
            (
              response.data?.workspace ??
              response.data ??
              {}
            ) as Partial<BootstrapWorkspace> &
              Record<string, unknown>
          );

        setWorkspaces((previous) => {
          const next = [
            workspace,
            ...previous.filter(
              (item) =>
                item.id !== workspace.id
            ),
          ];

          writeWorkspacesCache(
            userId,
            next
          );

          return next;
        });

        // We already have the new workspace locally.
        // No GET /workspaces required.
        await switchWorkspace(
          workspace.id
        );

        return workspace;
      },
      [
        userId,
        switchWorkspace,
      ]
    );

  // ── Update ────────────────────────────────────────────────────────────────

  const updateWorkspace =
    useCallback(
      async (
        workspaceId: string,
        payload: Partial<CreateWorkspacePayload>
      ): Promise<void> => {
        const response =
          await qxtApiClient.patch(
            `/api/v1/workspaces/${workspaceId}`,
            payload
          );

        const updated =
          normalizeWorkspace(
            (
              response.data?.workspace ??
              response.data ??
              {}
            ) as Partial<BootstrapWorkspace> &
              Record<string, unknown>
          );

        setWorkspaces((previous) => {
          const next =
            previous.map((workspace) =>
              workspace.id === updated.id
                ? updated
                : workspace
            );

          writeWorkspacesCache(
            userId,
            next
          );

          return next;
        });
      },
      [userId]
    );

  // ── Delete ────────────────────────────────────────────────────────────────

  const removeWorkspace =
    useCallback(
      async (
        workspaceId: string
      ): Promise<void> => {
        await qxtApiClient.delete(
          `/api/v1/workspaces/${workspaceId}`
        );

        setWorkspaces((previous) => {
          const next =
            previous.filter(
              (workspace) =>
                workspace.id !== workspaceId
            );

          writeWorkspacesCache(
            userId,
            next
          );

          return next;
        });

        if (
          String(activeWorkspaceId) ===
          String(workspaceId)
        ) {
          switchRuntimeToPersonal();
        }
      },
      [
        userId,
        activeWorkspaceId,
        switchRuntimeToPersonal,
      ]
    );

  // ── Derived state ─────────────────────────────────────────────────────────

  const isWorkspaceMode =
    spaceType === "workspace" &&
    activeWorkspace !== null;

  // ── Context value ─────────────────────────────────────────────────────────

  const value =
    useMemo<WorkspaceContextValue>(
      () => ({
        loading,
        initialized,

        workspaces,
        activeWorkspace,
        isWorkspaceMode,

        refreshWorkspaces,
        switchWorkspace,
        switchToPersonal,

        createWorkspace,
        removeWorkspace,
        updateWorkspace,
      }),
      [
        loading,
        initialized,
        workspaces,
        activeWorkspace,
        isWorkspaceMode,
        refreshWorkspaces,
        switchWorkspace,
        switchToPersonal,
        createWorkspace,
        removeWorkspace,
        updateWorkspace,
      ]
    );

  return (
    <WorkspaceContext.Provider
      value={value}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkspace(): WorkspaceContextValue {
  const context =
    useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useWorkspace must be used within WorkspaceProvider"
    );
  }

  return context;
}