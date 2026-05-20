import { qxtChatClient } from "../core/qxtClient";
import { API_BASE } from "../../config";

/* ======================================================
   TYPES
====================================================== */

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;

  images?: string[] | null;
  videos?: string[] | null;

  documents?: Array<{
    type: "document";
    url: string;
    name?: string;
    size?: number;
    mimeType?: string;
  }> | null;

  payload?: Record<string, any> | null;

  kind?:
  | "text"
  | "image"
  | "video"
  | "document"
  | "audio"
  | "recording"
  | "upgrade";

  audioUrl?: string;

  created_at?: string | null;
  updated_at?: string | null;

  edited?: boolean | null;
};

export type ChatSession = {
  id: string;

  title?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  last_message?: string | null;

  folder_id?: string | null;

  workspace_id?: string | null;

  scope?: "personal" | "workspace";
};

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  session_id: string;

  request_id?: string;

  stream?: boolean;

  tools?: any[];
  tool_choice?: any;
};

export type ChatResponse = {
  content?: string;

  session_id?: string;

  model?: string;

  payload?: {
    images?: string[];
    files?: string[];
    videos?: string[];
  };

  usage?: Record<string, any>;

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

/* ======================================================
   HELPERS
====================================================== */

function pickArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function getWorkspaceId(): string {
  return (
    localStorage.getItem("qxt_workspace_id") ||
    ""
  );
}

function getWorkspaceHeaders() {
  const workspaceId =
    localStorage.getItem(
      "qxt_workspace_id"
    );

  if (!workspaceId) {
    return {};
  }

  return {
    "X-Workspace-ID":
      workspaceId,
  };
}

/* ======================================================
   NORMALIZERS
====================================================== */

function normalizeMessages(raw: any): ChatMessage[] {
  try {
    let messagesArray: any[] = [];

    if (Array.isArray(raw)) {
      messagesArray = raw;
    } else if (raw && typeof raw === "object") {
      messagesArray =
        Array.isArray(raw.messages)
          ? raw.messages
          : Array.isArray(raw.data)
            ? raw.data
            : Array.isArray(raw.items)
              ? raw.items
              : [];
    }

    return messagesArray
      .filter(
        (m: any) =>
          m &&
          typeof m === "object" &&
          (m.role || m.content)
      )
      .map((m: any) => {
        const images = pickArray<string>(
          m.payload?.images || m.images
        );

        const videos = pickArray<string>(
          m.payload?.videos || m.videos
        );

        const audioUrl =
          m.payload?.audio_url ||
          m.audioUrl ||
          null;

        const documents = Array.isArray(
          m.payload?.documents
        )
          ? m.payload.documents.map((d: any) => ({
            type: "document" as const,
            url:
              d.url ||
              d.file_url ||
              "",
            name:
              d.name ||
              d.filename ||
              "Document",
            size:
              d.size || 0,
            mimeType:
              d.mime_type ||
              "application/octet-stream",
          }))
          : [];

        let kind: ChatMessage["kind"] = "text";

        if (documents.length > 0) {
          kind = "document";
        } else if (videos.length > 0) {
          kind = "video";
        } else if (images.length > 0) {
          kind = "image";
        } else if (audioUrl) {
          kind = "audio";
        }

        return {
          id: m.id ? String(m.id) : undefined,

          role:
            (m.role || "user") as
            | "user"
            | "assistant"
            | "system",

          content:
            typeof m.content === "string"
              ? m.content
              : "",

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

          audioUrl:
            audioUrl || undefined,

          payload:
            m.payload || null,

          kind,

          created_at:
            m.created_at ?? null,

          updated_at:
            m.updated_at ?? null,

          edited:
            typeof m.edited === "boolean"
              ? m.edited
              : null,
        };
      });
  } catch (err) {
    console.error(
      "[normalizeMessages] Error:",
      err
    );

    return [];
  }
}

function normalizeSessions(raw: any): ChatSession[] {
  try {
    let sessionsArray: any[] = [];

    if (Array.isArray(raw)) {
      sessionsArray = raw;
    } else if (raw && typeof raw === "object") {
      sessionsArray =
        Array.isArray(raw.sessions)
          ? raw.sessions
          : Array.isArray(raw.data)
            ? raw.data
            : Array.isArray(raw.items)
              ? raw.items
              : [];
    }

    return sessionsArray
      .filter(
        (s: any) =>
          s &&
          typeof s === "object" &&
          s.id
      )
      .map((s: any) => ({
        id: String(s.id),

        title:
          typeof s.title === "string"
            ? s.title
            : null,

        created_at:
          s.created_at ?? null,

        updated_at:
          s.updated_at ?? null,

        last_message:
          s.last_message ?? null,

        folder_id:
          s.folder_id ?? null,

        workspace_id:
          s.workspace_id ?? null,

        scope:
          s.scope === "workspace"
            ? "workspace"
            : "personal",
      }));
  } catch (err) {
    console.error(
      "[normalizeSessions] Error:",
      err
    );

    return [];
  }
}

/* ======================================================
   SESSIONS API
====================================================== */

export async function listSessions(): Promise<ChatSession[]> {
  try {
    const res = await qxtChatClient.get(
      "/api/v1/sessions",
      {
        headers:
          getWorkspaceHeaders(),
      }
    );

    return normalizeSessions(
      res.data
    );
  } catch (err) {
    console.error(
      "[listSessions] Failed:",
      err
    );

    return [];
  }
}

export async function createSession(payload?: {
  title?: string;
  folder_id?: string | null;
  workspace_chat?: boolean;
}): Promise<{ id: string }> {
  try {
    const res = await qxtChatClient.post(
      "/api/v1/sessions",
      {
        title:
          payload?.title?.trim() || null,

        folder_id:
          payload?.folder_id ?? null,

        workspace_chat:
          payload?.workspace_chat ?? false,
      },
      {
        headers:
          getWorkspaceHeaders(),
      }
    );

    const id = res.data?.id;

    if (!id || typeof id !== "string") {
      throw new Error(
        "Invalid session ID"
      );
    }

    return { id };
  } catch (err: any) {
    console.error(
      "[createSession] Failed:",
      err?.response?.data || err
    );

    throw err;
  }
}

export async function getSessionMessages(
  sessionId: string
): Promise<ChatMessage[]> {
  if (!sessionId) {
    throw new Error(
      "Missing sessionId"
    );
  }

  try {
    const res =
      await qxtChatClient.get(
        `/api/v1/sessions/${sessionId}/messages`,
        {
          headers:
            getWorkspaceHeaders(),
        }
      );

    return normalizeMessages(
      res.data
    );
  } catch (err: any) {
    if (
      err?.response?.status === 404
    ) {
      return [];
    }

    console.error(
      "[getSessionMessages] Failed:",
      err
    );

    throw err;
  }
}

export async function deleteSession(
  sessionId: string
): Promise<void> {
  if (!sessionId) {
    throw new Error(
      "Missing sessionId"
    );
  }

  try {
    await qxtChatClient.delete(
      `/api/v1/sessions/${sessionId}`,
      {
        headers:
          getWorkspaceHeaders(),
      }
    );
  } catch (err) {
    console.error(
      "[deleteSession] Failed:",
      err
    );

    throw err;
  }
}

export async function renameSession(
  sessionId: string,
  newTitle: string
): Promise<void> {
  if (!sessionId) {
    throw new Error(
      "Missing sessionId"
    );
  }

  if (!newTitle?.trim()) {
    throw new Error(
      "Title cannot be empty"
    );
  }

  try {
    await qxtChatClient.patch(
      `/api/v1/sessions/${sessionId}/rename`,
      {
        title: newTitle.trim(),
      },
      {
        headers: getWorkspaceHeaders(),
      }
    );
  } catch (err) {
    throw err;
  }
}

/* ======================================================
   CHAT API
====================================================== */

export async function sendChatMessage(
  sessionId: string,
  userMessage: string,
  model: string = "pulse",
  requestId?: string
): Promise<ChatResponse> {
  if (!sessionId) {
    throw new Error(
      "Session ID is required"
    );
  }

  if (!userMessage?.trim()) {
    throw new Error(
      "Message cannot be empty"
    );
  }

  const finalRequestId =
    requestId ||
    crypto.randomUUID();

  try {
    const res =
      await qxtChatClient.post(
        "/api/v1/chat/completions",
        {
          model,

          session_id:
            sessionId,

          request_id:
            finalRequestId,

          messages: [
            {
              role: "user",
              content:
                userMessage.trim(),
            },
          ],

          stream: false,
        },
        {
          headers:
            getWorkspaceHeaders(),
        }
      );

    return {
      content:
        res.data?.content || "",

      session_id:
        res.data?.session_id,

      model:
        res.data?.model || model,

      payload:
        res.data?.payload,

      usage:
        res.data?.usage,

      meta:
        res.data?.meta,
    };
  } catch (err) {
    console.error(
      "[sendChatMessage] Failed:",
      err
    );

    throw err;
  }
}

/* ======================================================
   STREAMING
====================================================== */

export async function* streamChatMessage(
  sessionId: string,
  userMessage: string,
  model: string = "pulse",
  requestId?: string
): AsyncGenerator<string, void, unknown> {
  if (!sessionId) {
    throw new Error(
      "Session ID is required"
    );
  }

  if (!userMessage?.trim()) {
    throw new Error(
      "Message cannot be empty"
    );
  }

  const finalRequestId =
    requestId ||
    crypto.randomUUID();

  const token =
    localStorage.getItem(
      "qxt_access_token"
    ) || "";

  const workspaceId =
    getWorkspaceId();

  try {
    const response = await fetch(
      `${API_BASE}/api/v1/chat/completions`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          ...(token
            ? {
              Authorization:
                `Bearer ${token}`,
            }
            : {}),

          ...(workspaceId
            ? {
              "X-Workspace-ID":
                workspaceId,
            }
            : {}),
        },

        body: JSON.stringify({
          model,

          session_id:
            sessionId,

          request_id:
            finalRequestId,

          stream: true,

          messages: [
            {
              role: "user",
              content:
                userMessage.trim(),
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Stream failed: ${response.status}`
      );
    }

    const reader =
      response.body?.getReader();

    const decoder =
      new TextDecoder();

    if (!reader) {
      throw new Error(
        "No stream reader"
      );
    }

    let buffer = "";

    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) break;

      buffer += decoder.decode(
        value,
        {
          stream: true,
        }
      );

      const lines =
        buffer.split("\n");

      buffer =
        lines.pop() || "";

      for (const line of lines) {
        if (
          !line.startsWith(
            "data: "
          )
        ) {
          continue;
        }

        const data =
          line.slice(6);

        if (data === "[DONE]") {
          return;
        }

        try {
          const chunk =
            JSON.parse(data);

          if (
            chunk.choices?.[0]
              ?.delta?.content
          ) {
            yield chunk
              .choices[0]
              .delta.content;
          }

          if (chunk.images) {
            yield `[IMAGES:${chunk.images.join(",")}]`;
          }
        } catch (e) {
          console.warn(
            "[streamChatMessage] Parse error:",
            data
          );
        }
      }
    }
  } catch (err) {
    console.error(
      "[streamChatMessage] Failed:",
      err
    );

    throw err;
  }
}

/* ======================================================
   UTIL
====================================================== */

export async function sendMessageAndRefresh(
  sessionId: string,
  userMessage: string,
  model: string = "pulse"
) {
  const response =
    await sendChatMessage(
      sessionId,
      userMessage,
      model
    );

  const messages =
    await getSessionMessages(
      sessionId
    );

  return {
    response:
      response.content || "",

    messages,
  };
}