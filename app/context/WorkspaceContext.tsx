"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAgentRuntime } from "./AgentRuntimeContext";

import {
  qxtApiClient,
  getStoredToken,
} from "../lib/api/core/qxtClient";

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

const WorkspaceContext =
  createContext<WorkspaceContextValue | null>(
    null
  );

function normalizeWorkspace(
  raw: any
): Workspace {
  return {
    id: String(raw?.id ?? ""),
    name:
      raw?.name ||
      "Untitled Workspace",
    slug:
      raw?.slug ||
      undefined,
    logo_url:
      raw?.logo_url ||
      null,
    description:
      raw?.description ||
      null,
    role:
      raw?.role ||
      "member",
    type:
      raw?.type ||
      "Personal",
    plan:
      raw?.plan ||
      "Free Plan",
    balance: Number(
      raw?.balance || 0
    ),
    seats: Number(
      raw?.seats || 1
    ),
    projects_count: Number(
      raw?.projects_count || 0
    ),
    members_count: Number(
      raw?.members_count || 1
    ),
    api_requests: Number(
      raw?.api_requests || 0
    ),
    created_at:
      raw?.created_at ||
      undefined,
  };
}

export function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const {
    spaceType,
    activeWorkspaceId,
    switchToWorkspace,
    switchToPersonal: switchRuntimeToPersonal,
  } = useAgentRuntime();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    initialized,
    setInitialized,
  ] = useState(false);

  const [
    workspaces,
    setWorkspaces,
  ] = useState<Workspace[]>(
    []
  );

  const [
    activeWorkspace,
    setActiveWorkspace,
  ] = useState<Workspace | null>(
    null
  );

  const refreshWorkspaces =
    useCallback(
      async (): Promise<void> => {
        try {
          setLoading(true);

          const token =
            getStoredToken();

          if (!token) {
            setWorkspaces([]);
            setActiveWorkspace(null);
            return;
          }

          if (spaceType !== "workspace") {
  setWorkspaces([]);
  setActiveWorkspace(null);
  return;
}

          const response =
            await qxtApiClient.get(
              "/api/v1/workspaces"
            );

          const raw =
            response.data?.items ||
            response.data?.workspaces ||
            [];

          const normalized: Workspace[] =
            Array.isArray(raw)
              ? raw.map(
                  normalizeWorkspace
                )
              : [];

          setWorkspaces(normalized);

          if (
            spaceType ===
              "workspace" &&
            activeWorkspaceId
          ) {
            const matched =
              normalized.find(
                (workspace) =>
                  String(
                    workspace.id
                  ) ===
                  String(
                    activeWorkspaceId
                  )
              ) || null;

            if (matched) {
              setActiveWorkspace(
                matched
              );
            } else if (
              normalized.length > 0
            ) {
              const fallback =
                normalized[0];
              setActiveWorkspace(
                fallback
              );
              switchToWorkspace(
                fallback.id
              );
            } else {
              setActiveWorkspace(
                null
              );
              switchRuntimeToPersonal();
            }

            return;
          }

          setActiveWorkspace(null);
        } catch (error) {
          console.error(
            "❌ Failed loading workspaces",
            error
          );
          setWorkspaces([]);
          setActiveWorkspace(null);
        } finally {
          setLoading(false);
          setInitialized(true);
        }
      },
      [
        spaceType,
        activeWorkspaceId,
        switchToWorkspace,
        switchRuntimeToPersonal,
      ]
    );

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
          ) || null;

        if (!workspace) {
          console.warn(
            "[Workspace] Not found:",
            workspaceId
          );
          return;
        }

        setActiveWorkspace(
          workspace
        );
        switchToWorkspace(
          workspace.id
        );

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

  const switchToPersonal =
    useCallback((): void => {
      setActiveWorkspace(null);
      switchRuntimeToPersonal();
    }, [
      switchRuntimeToPersonal,
    ]);

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
            response.data
              ?.workspace ||
              response.data
          );

        setWorkspaces((prev) => [
          workspace,
          ...prev,
        ]);

        await switchWorkspace(
          workspace.id
        );

        return workspace;
      },
      [switchWorkspace]
    );

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
            response.data
              ?.workspace ||
              response.data
          );

        setWorkspaces((prev) =>
          prev.map((workspace) =>
            workspace.id === updated.id
              ? updated
              : workspace
          )
        );

        setActiveWorkspace((prev) =>
          prev?.id === updated.id
            ? updated
            : prev
        );
      },
      []
    );

  const removeWorkspace =
    useCallback(
      async (
        workspaceId: string
      ): Promise<void> => {
        await qxtApiClient.delete(
          `/api/v1/workspaces/${workspaceId}`
        );

        const filtered =
          workspaces.filter(
            (workspace) =>
              workspace.id !==
              workspaceId
          );

        setWorkspaces(filtered);

        if (
          activeWorkspace?.id ===
          workspaceId
        ) {
          setActiveWorkspace(null);
          switchRuntimeToPersonal();
        }
      },
      [
        workspaces,
        activeWorkspace,
        switchRuntimeToPersonal,
      ]
    );

  useEffect(() => {
    refreshWorkspaces().catch(
      (error) => {
        console.error(
          "❌ Workspace bootstrap failed",
          error
        );
      }
    );
  }, [refreshWorkspaces]);

  useEffect(() => {
    if (
      spaceType !==
      "workspace"
    ) {
      setActiveWorkspace(null);
      return;
    }

    if (!activeWorkspaceId) {
      setActiveWorkspace(null);
      return;
    }

    const matched =
      workspaces.find(
        (workspace) =>
          String(workspace.id) ===
          String(
            activeWorkspaceId
          )
      ) || null;

    setActiveWorkspace(
      matched
    );
  }, [
    spaceType,
    activeWorkspaceId,
    workspaces,
  ]);

  const isWorkspaceMode =
    spaceType ===
      "workspace" &&
    !!activeWorkspace;

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

export function useWorkspace(): WorkspaceContextValue {
  const context =
    useContext(
      WorkspaceContext
    );

  if (!context) {
    throw new Error(
      "useWorkspace must be used within WorkspaceProvider"
    );
  }

  return context;
}