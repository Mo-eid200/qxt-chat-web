"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    qxtApiClient,
    getStoredContext,
    setStoredContext,
    clearStoredContext,
    getStoredToken,
} from "../lib/api/core/qxtClient";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   CONTEXT
========================================================= */

const WorkspaceContext =
    createContext<WorkspaceContextValue | null>(
        null
    );

/* =========================================================
   HELPERS
========================================================= */

function normalizeWorkspace(
    raw: any
): Workspace {
    return {
        id: String(raw?.id ?? ""),

        name:
            raw?.name ||
            "Untitled Workspace",

        slug:
            raw?.slug || undefined,

        logo_url:
            raw?.logo_url || null,

        description:
            raw?.description || null,

        role:
            raw?.role || "member",

        type:
            raw?.type || "Personal",

        plan:
            raw?.plan || "Free Plan",

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

/* =========================================================
   PROVIDER
========================================================= */

export function WorkspaceProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [loading, setLoading] =
        useState(true);

    const [
        initialized,
        setInitialized,
    ] = useState(false);

    const [workspaces, setWorkspaces] =
        useState<Workspace[]>([]);

    const [
        activeWorkspace,
        setActiveWorkspace,
    ] = useState<Workspace | null>(
        null
    );

    /* =====================================================
       FETCH WORKSPACES
    ===================================================== */

    const refreshWorkspaces =
        useCallback(async () => {
            try {
                setLoading(true);

                const token =
                    getStoredToken();

                if (!token) {
                    setWorkspaces([]);

                    setActiveWorkspace(
                        null
                    );

                    clearStoredContext();

                    return;
                }

                const res =
                    await qxtApiClient.get(
                        "/api/v1/workspaces"
                    );

                const raw =
                    res.data?.items ||
                    res.data?.workspaces ||
                    [];

                const normalized =
                    Array.isArray(raw)
                        ? raw.map(
                            normalizeWorkspace
                        )
                        : [];

                setWorkspaces(normalized);

                /* =========================================
                   RESTORE CONTEXT
                ========================================= */

                const stored =
                    getStoredContext();

                let nextActive: Workspace | null =
                    null;

                if (
                    stored?.workspaceId
                ) {
                    nextActive =
                        normalized.find(
                            (w) =>
                                String(
                                    w.id
                                ) ===
                                String(
                                    stored.workspaceId
                                )
                        ) || null;
                }

                /* =========================================
                   IMPORTANT:
                   default = personal mode
                ========================================= */

                if (
                    stored?.environment ===
                    "workspace"
                ) {
                    if (
                        !nextActive &&
                        normalized.length > 0
                    ) {
                        nextActive =
                            normalized[0];
                    }
                } else {
                    nextActive = null;
                }

                setActiveWorkspace(
                    nextActive
                );

                /* =========================================
                   REPAIR INVALID STORAGE
                ========================================= */

                if (
                    nextActive
                ) {
                    setStoredContext({
                        workspaceId:
                            nextActive.id,

                        environment:
                            "workspace",
                    });
                } else {
                    setStoredContext({
                        workspaceId:
                            null,

                        environment:
                            "personal",
                    });
                }
            } catch (error) {
                console.error(
                    "❌ Failed loading workspaces",
                    error
                );

                setWorkspaces([]);

                setActiveWorkspace(
                    null
                );

                clearStoredContext();
            } finally {
                setLoading(false);

                setInitialized(true);
            }
        }, []);

    /* =====================================================
       SWITCH WORKSPACE
    ===================================================== */

    const switchWorkspace =
        useCallback(
            async (
                workspaceId: string
            ) => {
                const workspace =
                    workspaces.find(
                        (w) =>
                            String(
                                w.id
                            ) ===
                            String(
                                workspaceId
                            )
                    ) || null;

                if (!workspace) {
                    return;
                }

                setStoredContext({
                    workspaceId:
                        workspace.id,

                    environment:
                        "workspace",
                });

                setActiveWorkspace(
                    workspace
                );

                try {
                    await qxtApiClient.post(
                        `/api/v1/workspaces/${workspace.id}/activate`
                    );
                } catch (
                error
                ) {
                    console.warn(
                        "Workspace activation skipped",
                        error
                    );
                }
            },
            [workspaces]
        );

    /* =====================================================
       PERSONAL MODE
    ===================================================== */

    const switchToPersonal =
        useCallback(() => {
            setStoredContext({
                workspaceId:
                    null,

                environment:
                    "personal",
            });

            setActiveWorkspace(
                null
            );
        }, []);

    /* =====================================================
       CREATE WORKSPACE
    ===================================================== */

    const createWorkspace =
        useCallback(
            async (
                payload: CreateWorkspacePayload
            ): Promise<Workspace> => {
                const res =
                    await qxtApiClient.post(
                        "/api/v1/workspaces",
                        payload
                    );

                const workspace =
                    normalizeWorkspace(
                        res.data
                            ?.workspace ||
                        res.data
                    );

                setWorkspaces(
                    (prev) => [
                        workspace,
                        ...prev,
                    ]
                );

                await switchWorkspace(
                    workspace.id
                );

                return workspace;
            },
            [switchWorkspace]
        );

    /* =====================================================
       UPDATE WORKSPACE
    ===================================================== */

    const updateWorkspace =
        useCallback(
            async (
                workspaceId: string,
                payload: Partial<CreateWorkspacePayload>
            ) => {
                const res =
                    await qxtApiClient.patch(
                        `/api/v1/workspaces/${workspaceId}`,
                        payload
                    );

                const updated =
                    normalizeWorkspace(
                        res.data
                            ?.workspace ||
                        res.data
                    );

                setWorkspaces(
                    (prev) =>
                        prev.map(
                            (w) =>
                                w.id ===
                                    updated.id
                                    ? updated
                                    : w
                        )
                );

                setActiveWorkspace(
                    (prev) =>
                        prev?.id ===
                            updated.id
                            ? updated
                            : prev
                );
            },
            []
        );

    /* =====================================================
       DELETE WORKSPACE
    ===================================================== */

    const removeWorkspace =
        useCallback(
            async (
                workspaceId: string
            ) => {
                await qxtApiClient.delete(
                    `/api/v1/workspaces/${workspaceId}`
                );

                const filtered =
                    workspaces.filter(
                        (w) =>
                            w.id !==
                            workspaceId
                    );

                setWorkspaces(
                    filtered
                );

                if (
                    activeWorkspace?.id ===
                    workspaceId
                ) {
                    setActiveWorkspace(
                        null
                    );

                    setStoredContext({
                        workspaceId:
                            null,

                        environment:
                            "personal",
                    });
                }
            },
            [
                activeWorkspace,
                workspaces,
            ]
        );

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
        refreshWorkspaces();
    }, [refreshWorkspaces]);

    /* =====================================================
       COMPUTED
    ===================================================== */

    const isWorkspaceMode =
        !!activeWorkspace;

    /* =====================================================
       MEMO
    ===================================================== */

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

/* =========================================================
   HOOK
========================================================= */

export function useWorkspace() {
    const ctx =
        useContext(
            WorkspaceContext
        );

    if (!ctx) {
        throw new Error(
            "useWorkspace must be used within WorkspaceProvider"
        );
    }

    return ctx;
}