// app/lib/api/workspace/workspace.ts

import axios, {
  AxiosError,
} from "axios";

import { qxtChatClient } from "../core/qxtClient";

/* ======================================================
   TYPES
====================================================== */

export type WorkspaceItemKind =
  | "project"
  | "folder"
  | "library"
  | "code";

export type WorkspaceFolder = {
  id: string;

  title: string;

  kind: WorkspaceItemKind;

  parent_id: string | null;

  workspace_id: string | null;

  created_at: string | null;

  updated_at: string | null;
};

export type WorkspaceTree = {
  folders: WorkspaceFolder[];

  projects: WorkspaceFolder[];
};

export type ApiError = {
  code: string;

  message: string;

  status: number;
};

/* ======================================================
   CONSTANTS
====================================================== */

const VALID_KINDS: WorkspaceItemKind[] = [
  "project",
  "folder",
  "library",
  "code",
];

/* ======================================================
   HELPERS
====================================================== */

function toStringOrNull(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function normalizeKind(
  value: unknown
): WorkspaceItemKind {
  return VALID_KINDS.includes(
    value as WorkspaceItemKind
  )
    ? (value as WorkspaceItemKind)
    : "project";
}

function normalizeFolder(
  raw: unknown
): WorkspaceFolder {
  const item =
    raw &&
      typeof raw === "object"
      ? (raw as Record<
        string,
        unknown
      >)
      : {};

  return {
    id: String(
      item.id ?? ""
    ),

    title:
      typeof item.title === "string" &&
        item.title.trim()
        ? item.title.trim()
        : "Untitled",

    kind: normalizeKind(
      item.kind
    ),

    parent_id:
      toStringOrNull(
        item.parent_id
      ),

    workspace_id:
      toStringOrNull(
        item.workspace_id
      ),

    created_at:
      toStringOrNull(
        item.created_at
      ),

    updated_at:
      toStringOrNull(
        item.updated_at
      ),
  };
}

function normalizeTree(
  raw: unknown
): WorkspaceTree {
  const data =
    raw &&
      typeof raw === "object"
      ? (raw as Record<
        string,
        unknown
      >)
      : {};

  const folders = Array.isArray(
    data.folders
  )
    ? data.folders.map(
      normalizeFolder
    )
    : [];

  const projects = Array.isArray(
    data.projects
  )
    ? data.projects.map(
      normalizeFolder
    )
    : folders.filter(
      (item) =>
        item.kind ===
        "project"
    );

  return {
    folders,
    projects,
  };
}

function parseApiError(
  error: unknown,
  fallback: string
): ApiError {
  if (
    axios.isAxiosError(error)
  ) {
    const err =
      error as AxiosError<any>;

    const data = err.response?.data;

    if (
      data &&
      typeof data === "object"
    ) {
      const detail =
        data.detail;

      if (
        detail &&
        typeof detail ===
        "object"
      ) {
        return {
          code:
            detail.code ||
            "API_ERROR",

          message:
            detail.message ||
            fallback,

          status:
            err.response
              ?.status ||
            500,
        };
      }
    }

    return {
      code: "REQUEST_FAILED",

      message:
        err.message ||
        fallback,

      status:
        err.response
          ?.status || 500,
    };
  }

  return {
    code: "UNKNOWN_ERROR",

    message: fallback,

    status: 500,
  };
}

/* ======================================================
   API
====================================================== */

/**
 * GET /api/v1/workspace/tree
 */
export async function getWorkspaceTree(): Promise<WorkspaceTree> {
  try {
    const response =
      await qxtChatClient.get(
        "/api/v1/workspaces/tree"
      );

    return normalizeTree(
      response.data
    );
  } catch (error) {
    console.error(
      "[workspace:getWorkspaceTree]",
      error
    );

    throw parseApiError(
      error,
      "Failed to load workspace tree."
    );
  }
}

/**
 * POST /api/v1/folders
 */
export async function createProjectFolder(
  title: string
): Promise<WorkspaceFolder> {
  const cleanTitle =
    title?.trim();

  if (!cleanTitle) {
    throw {
      code:
        "INVALID_TITLE",
      message:
        "Project title required.",
      status: 400,
    } satisfies ApiError;
  }

  try {
    const response =
      await qxtChatClient.post(
        "/api/v1/folders",
        {
          title:
            cleanTitle,

          kind: "project",
        }
      );

    return normalizeFolder(
      response.data
    );
  } catch (error) {
    console.error(
      "[workspace:createProjectFolder]",
      error
    );

    throw parseApiError(
      error,
      "Failed to create project."
    );
  }
}

/**
 * PATCH /api/v1/folders/:id
 */
export async function renameProjectFolder(
  folderId: string,
  title: string
): Promise<WorkspaceFolder> {
  const cleanFolderId =
    folderId?.trim();

  const cleanTitle =
    title?.trim();

  if (!cleanFolderId) {
    throw {
      code:
        "INVALID_FOLDER_ID",

      message:
        "Folder id required.",

      status: 400,
    } satisfies ApiError;
  }

  if (!cleanTitle) {
    throw {
      code:
        "INVALID_TITLE",

      message:
        "Title required.",

      status: 400,
    } satisfies ApiError;
  }

  try {
    const response =
      await qxtChatClient.patch(
        `/api/v1/folders/${cleanFolderId}`,
        {
          title:
            cleanTitle,
        }
      );

    return normalizeFolder(
      response.data
    );
  } catch (error) {
    console.error(
      "[workspace:renameProjectFolder]",
      error
    );

    throw parseApiError(
      error,
      "Failed to rename project."
    );
  }
}

/**
 * DELETE /api/v1/folders/:id
 */
export async function deleteProjectFolder(
  folderId: string
): Promise<{
  ok: true;
}> {
  const cleanFolderId =
    folderId?.trim();

  if (!cleanFolderId) {
    throw {
      code:
        "INVALID_FOLDER_ID",

      message:
        "Folder id required.",

      status: 400,
    } satisfies ApiError;
  }

  try {
    await qxtChatClient.delete(
      `/api/v1/folders/${cleanFolderId}`
    );

    return {
      ok: true,
    };
  } catch (error) {
    console.error(
      "[workspace:deleteProjectFolder]",
      error
    );

    throw parseApiError(
      error,
      "Failed to delete project."
    );
  }
}