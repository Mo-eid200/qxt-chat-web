import {
  qxtChatClient,
  getStoredToken,
  getStoredContext,
} from "../core/qxtClient";

import type {
  ProjectFolder,
  WorkspaceTree,
} from "@/app/types/workspace";

function isProjectSpace() {
  const runtime = getStoredContext();

  return (
    runtime.spaceType === "personal" ||
    runtime.spaceType === "workspace"
  );
}

type FetchWorkspaceTreeOptions = {
  agentId?: string | null;
};

export async function fetchWorkspaceTree(
  options?: FetchWorkspaceTreeOptions
): Promise<WorkspaceTree> {
  const token = getStoredToken();

  if (!token) {
    return {
      folders: [],
      unfiled: [],
    };
  }

  if (!isProjectSpace()) {
    return {
      folders: [],
      unfiled: [],
    };
  }

  try {
    const params =
      options?.agentId
        ? {
            agent_id: options.agentId,
          }
        : undefined;

    const res =
      await qxtChatClient.get(
        "/api/v1/folders/tree",
        { params }
      );

    const data = res.data || {};

    return {
      folders: Array.isArray(
        data.folders
      )
        ? data.folders
        : [],
      unfiled: Array.isArray(
        data.unfiled
      )
        ? data.unfiled
        : [],
    };
  } catch (error) {
    console.error(
      "[fetchWorkspaceTree]",
      error
    );

    return {
      folders: [],
      unfiled: [],
    };
  }
}

export async function createProjectFolder(
  title: string
) {
  const token = getStoredToken();

  if (!token) {
    throw new Error(
      "Authentication required"
    );
  }

  if (!isProjectSpace()) {
    throw new Error(
      "Projects are only available inside Personal or Workspace"
    );
  }

  const res =
    await qxtChatClient.post(
      "/api/v1/folders",
      {
        title,
      }
    );

  return res.data;
}

export async function moveSessionToFolder(
  sid: string,
  folderId: string | null
) {
  const token = getStoredToken();

  if (!token) {
    throw new Error(
      "Authentication required"
    );
  }

  if (!isProjectSpace()) {
    throw new Error(
      "Projects are only available inside Personal or Workspace"
    );
  }

  await qxtChatClient.post(
    "/api/v1/folders/move-session",
    {
      session_id: sid,
      folder_id: folderId,
    }
  );
}

export async function reorderFolderSessions(
  folderId: string | null,
  orderedIds: string[]
) {
  const token = getStoredToken();

  if (!token) {
    throw new Error(
      "Authentication required"
    );
  }

  if (!isProjectSpace()) {
    throw new Error(
      "Projects are only available inside Personal or Workspace"
    );
  }

  if (!folderId) {
    throw new Error(
      "folderId is required for folder reordering"
    );
  }

  await qxtChatClient.post(
    `/api/v1/folders/${folderId}/reorder-sessions`,
    {
      ordered_ids: orderedIds,
    }
  );
}

export async function renameSession(
  sid: string,
  title: string
) {
  const token = getStoredToken();

  if (!token) {
    throw new Error(
      "Authentication required"
    );
  }

  await qxtChatClient.patch(
    `/api/v1/sessions/${sid}`,
    {
      title,
    }
  );
}

export function normalizeWorkspaceTree(
  tree: WorkspaceTree
): WorkspaceTree {
  const folders: ProjectFolder[] =
    (tree.folders || []).map(
      (folder: any) => ({
        ...folder,
        chats: Array.isArray(
          folder.chats
        )
          ? folder.chats
          : Array.isArray(
                folder.sessions
              )
            ? folder.sessions
            : [],
      })
    );

  return {
    folders,
    unfiled: Array.isArray(
      tree.unfiled
    )
      ? tree.unfiled
      : [],
  };
}