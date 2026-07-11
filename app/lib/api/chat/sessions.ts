import axios, {
  AxiosError,
} from "axios";

import {
  getStoredContext,
  qxtChatClient,
} from "../core/qxtClient";

/* =========================================================
   TYPES
========================================================= */

export type ChatRole =
  | "user"
  | "assistant"
  | "system";

export type ChatScope =
  | "personal"
  | "workspace";

export type MessageKind =
  | "text"
  | "image"
  | "video"
  | "document"
  | "audio"
  | "recording"
  | "upgrade";

export type ChatAttachment = {
  type: "document";
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
};

export type ChatMessage = {
  id?: string;
  role: ChatRole;
  content: string;
  kind?: MessageKind;
  payload?: Record<
    string,
    any
  > | null;
  images?: string[] | null;
  videos?: string[] | null;
  documents?: ChatAttachment[] | null;
  audioUrl?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  edited?: boolean | null;
};

export type ChatSession = {
  id: string;
  title?: string | null;
  scope?: ChatScope;
  workspace_id?: string | null;
  agent_id?: string | null;
  folder_id?: string | null;
  last_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ChatResponse = {
  content?: string;
  model?: string;
  session_id?: string;
  payload?: {
    images?: string[];
    files?: string[];
    videos?: string[];
  };
  usage?: Record<
    string,
    any
  >;
  meta?: {
    trace_id?: string;
    request_id?: string;
    execution_time_ms?: number;
    cached?: boolean;
  };
};

export type StreamChunk = {
  event?: string;
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  images?: string[];
  error?: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const CHAT_API_PREFIX =
  "/api/v1";

/* =========================================================
   RUNTIME CONTEXT
========================================================= */

function getRuntimeContext() {
  const context =
    getStoredContext();

  return {
    spaceType:
      context.spaceType,
    workspace_id:
      context.spaceType ===
      "workspace"
        ? context.workspaceId
        : undefined,
    agent_id:
      context.activeAgentId ??
      undefined,
  };
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeArray<T>(
  value: any
): T[] {
  return Array.isArray(value)
    ? value
    : [];
}

function parseApiError(
  error: unknown
): never {
  if (
    axios.isAxiosError(error)
  ) {
    const axiosError =
      error as AxiosError<any>;

    const status =
      axiosError.response
        ?.status;

    const detail =
      axiosError.response
        ?.data?.detail;

    const message =
      detail?.message ||
      detail?.code ||
      detail ||
      axiosError.message;

    if (status === 400) {
      throw new Error(
        typeof message ===
          "string"
          ? message
          : "Bad request"
      );
    }

    if (status === 401) {
      throw new Error(
        "Unauthorized"
      );
    }

    if (status === 403) {
      throw new Error(
        "Forbidden"
      );
    }

    if (status === 404) {
      throw new Error(
        "Not found"
      );
    }

    if (status === 409) {
      throw new Error(
        "Already processing"
      );
    }

    if (status === 422) {
      throw new Error(
        "Invalid session payload"
      );
    }

    if (status === 429) {
      throw new Error(
        "Rate limit exceeded"
      );
    }

    if (status === 503) {
      throw new Error(
        "System overloaded"
      );
    }

    throw new Error(
      message ||
        "API request failed"
    );
  }

  throw error;
}

/* =========================================================
   NORMALIZERS
========================================================= */

function normalizeMessage(
  raw: any
): ChatMessage {
  const images =
    normalizeArray<string>(
      raw?.payload?.images ||
        raw?.images
    );

  const videos =
    normalizeArray<string>(
      raw?.payload?.videos ||
        raw?.videos
    );

  const documents =
    Array.isArray(
      raw?.payload?.documents
    )
      ? raw.payload.documents.map(
          (doc: any) => ({
            type:
              "document" as const,
            url:
              doc.url ||
              doc.file_url ||
              "",
            name:
              doc.name ||
              doc.filename ||
              "Document",
            size:
              doc.size || 0,
            mimeType:
              doc.mime_type ||
              "application/octet-stream",
          })
        )
      : [];

  const audioUrl =
    raw?.payload?.audio_url ||
    raw?.audioUrl ||
    null;

  let kind: MessageKind =
    "text";

  if (documents.length > 0) {
    kind = "document";
  } else if (
    videos.length > 0
  ) {
    kind = "video";
  } else if (
    images.length > 0
  ) {
    kind = "image";
  } else if (audioUrl) {
    kind = "audio";
  }

  return {
    id: raw?.id
      ? String(raw.id)
      : undefined,
    role:
      raw?.role || "user",
    content:
      typeof raw?.content ===
      "string"
        ? raw.content
        : "",
    payload:
      raw?.payload || null,
    images:
      images.length > 0
        ? images
        : null,
    videos:
      videos.length > 0
        ? videos
        : null,
    documents:
      documents.length > 0
        ? documents
        : null,
    audioUrl,
    kind,
    created_at:
      raw?.created_at ??
      null,
    updated_at:
      raw?.updated_at ??
      null,
    edited:
      typeof raw?.edited ===
      "boolean"
        ? raw.edited
        : null,
  };
}

function normalizeMessages(
  raw: any
): ChatMessage[] {
  const source =
    Array.isArray(raw)
      ? raw
      : Array.isArray(
            raw?.items
          )
        ? raw.items
        : Array.isArray(
              raw?.messages
            )
          ? raw.messages
          : Array.isArray(
                raw?.data
              )
            ? raw.data
            : [];

  return source
    .filter(Boolean)
    .map(normalizeMessage);
}

function normalizeSession(
  raw: any
): ChatSession {
  const scope: ChatScope =
    raw?.workspace_id
      ? "workspace"
      : "personal";

  return {
    id: String(raw.id),
    title:
      raw.title || null,
    scope,
    workspace_id:
      raw.workspace_id ||
      null,
    agent_id:
      raw.agent_id ||
      null,
    folder_id:
      raw.folder_id ||
      null,
    last_message:
      raw.last_message ||
      null,
    created_at:
      raw.created_at ||
      null,
    updated_at:
      raw.updated_at ||
      null,
  };
}

function normalizeSessions(
  raw: any
): ChatSession[] {
  const source =
    Array.isArray(raw)
      ? raw
      : Array.isArray(
            raw?.items
          )
        ? raw.items
        : Array.isArray(
              raw?.sessions
            )
          ? raw.sessions
          : Array.isArray(
                raw?.data
              )
            ? raw.data
            : [];

  return source
    .filter(Boolean)
    .map(normalizeSession);
}

/* =========================================================
   SESSION HELPERS
========================================================= */

function buildSessionParams() {
  const runtime =
    getRuntimeContext();

  const params: Record<
    string,
    string
  > = {};

  if (runtime.agent_id) {
    params.kind = "agent";
    params.agent_id =
      runtime.agent_id;

    if (runtime.workspace_id) {
      params.workspace_id =
        runtime.workspace_id;
    }

    return params;
  }

  if (
    runtime.spaceType ===
    "workspace"
  ) {
    params.kind =
      "workspace";

    if (runtime.workspace_id) {
      params.workspace_id =
        runtime.workspace_id;
    }

    return params;
  }

  params.kind = "chat";
  return params;
}

function buildCreatePayload(
  payload?: {
    title?: string;
    folder_id?: string | null;
  }
) {
  const runtime =
    getRuntimeContext();

  const body: Record<
    string,
    any
  > = {
    title:
      payload?.title?.trim() ||
      null,
    folder_id:
      payload?.folder_id ??
      null,
  };

  if (runtime.agent_id) {
    body.kind = "agent";
    body.agent_id =
      runtime.agent_id;

    if (runtime.workspace_id) {
      body.workspace_id =
        runtime.workspace_id;
    }

    return body;
  }

  if (
    runtime.spaceType ===
      "workspace" &&
    runtime.workspace_id
  ) {
    body.kind =
      "workspace";
    body.workspace_id =
      runtime.workspace_id;

    return body;
  }

  body.kind = "chat";
  return body;
}

/* =========================================================
   SESSIONS
========================================================= */

export async function listSessions() {
  try {
    const response =
      await qxtChatClient.get(
        `${CHAT_API_PREFIX}/sessions`,
        {
          params:
            buildSessionParams(),
        }
      );

    return normalizeSessions(
      response.data
    );
  } catch (error) {
    console.error(
      "[listSessions]",
      error
    );

    return [];
  }
}

export async function createSession(
  payload?: {
    title?: string;
    folder_id?: string | null;
  }
): Promise<ChatSession> {
  try {
    const response =
      await qxtChatClient.post(
        `${CHAT_API_PREFIX}/sessions`,
        buildCreatePayload(
          payload
        )
      );

    return normalizeSession(
      response.data
    );
  } catch (error) {
    console.error(
      "[createSession]",
      error
    );

    parseApiError(error);
  }
}

export async function getSessionMessages(
  sessionId: string
): Promise<
  ChatMessage[]
> {
  try {
    const response =
      await qxtChatClient.get(
        `${CHAT_API_PREFIX}/sessions/${sessionId}/messages`
      );

    return normalizeMessages(
      response.data
    );
  } catch (error: any) {
    if (
      error?.response?.status ===
      404
    ) {
      return [];
    }

    console.error(
      "[getSessionMessages]",
      error
    );

    parseApiError(error);
  }
}

export async function deleteSession(
  sessionId: string
): Promise<void> {
  try {
    await qxtChatClient.delete(
      `${CHAT_API_PREFIX}/sessions/${sessionId}`
    );
  } catch (error) {
    console.error(
      "[deleteSession]",
      error
    );

    parseApiError(error);
  }
}