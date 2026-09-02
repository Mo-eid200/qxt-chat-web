import axios, {
  AxiosError,
} from "axios";

import {
  getStoredApiKey,
  getStoredCompany,
  getStoredContext,
  getStoredToken,
  qxtChatClient,
} from "../core/qxtClient";

/* =========================================================
   TYPES
========================================================= */

export type ChatRole =
  | "user"
  | "assistant"
  | "system";

export type MessageKind =
  | "text"
  | "image"
  | "video"
  | "document"
  | "audio"
  | "recording"
  | "upgrade";

export type ChatDocument = {
  type: "document";
  url: string;
  name: string;
  size: number;
  mimeType: string;
};

export type ChatMessage = {
  role: ChatRole;
  content: any;
  images?: string[] | null;
  videos?: string[] | null;
  documents?: ChatDocument[] | null;
  kind?: MessageKind;
  audioUrl?: string;
  tokens?: number;
  limit?: number;
};

export type ChatCompletionRequest = {
  session_id: string;
  model: string;
  messages: any[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  request_id?: string;
  workspace_id?: string | null;
  agent_id?: string | null;
};

export type ChatCompletionResponse = {
  content: string;
  session_id: string;
  model: string;
  images?: string[];
  videos?: string[];
  payload?: {
    images?: string[];
    files?: string[];
    videos?: string[];
    documents?: Array<{
      type: string;
      url: string;
      name: string;
      size: number;
      mime_type: string;
    }>;
  };
  meta?: {
    trace_id: string;
    request_id: string;
    execution_time_ms: number;
    cached: boolean;
  };
  usage?: {
    actual_tokens: number;
    actual_units: number;
    variance_pct: number;
  };
};

/* =========================================================
   CONSTANTS
========================================================= */

const CHAT_API_PREFIX =
  "/api/v1";

const DEFAULT_MODEL =
  "pulse-core";

const REQUEST_TIMEOUT =
  1000 * 60 * 10;

/* =========================================================
   HELPERS
========================================================= */

function isNumericString(
  value: string | null | undefined
): boolean {
  if (!value) {
    return false;
  }

  return /^\d+$/.test(
    value.trim()
  );
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
        "Session not found"
      );
    }

    if (status === 409) {
      throw new Error(
        "Request already processing"
      );
    }

    if (status === 422) {
      throw new Error(
        "Invalid chat payload"
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
        "Chat request failed"
    );
  }

  throw error;
}

function normalizeTextContent(
  content: any
): string {
  if (
    typeof content ===
    "string"
  ) {
    return content.trim();
  }

  if (
    Array.isArray(content)
  ) {
    return content
      .filter(
        (x) =>
          x?.type === "text"
      )
      .map(
        (x) =>
          x?.text || ""
      )
      .join("\n")
      .trim();
  }

  return "";
}

function sanitizeMessages(
  messages: ChatMessage[]
) {
  return messages
    .map((message) => {
      const content: any[] =
        [];

      const text =
        normalizeTextContent(
          message.content
        );

      if (text) {
        content.push({
          type: "text",
          text,
        });
      }

      (
        message.images || []
      ).forEach((url) => {
        if (!url) {
          return;
        }

        content.push({
          type: "image_url",
          image_url: {
            url,
          },
        });
      });

      (
        message.documents ||
        []
      ).forEach((doc) => {
        if (!doc?.url) {
          return;
        }

        content.push({
          type: "document",
          document: {
            url: doc.url,
            name: doc.name,
            mime_type:
              doc.mimeType,
          },
        });
      });

      return {
        role: message.role,
        content,
      };
    })
    .filter((message) => {
      if (
        !message ||
        typeof message !==
          "object"
      ) {
        return false;
      }

      if (
        !Array.isArray(
          message.content
        )
      ) {
        return false;
      }

      return (
        message.content.length > 0
      );
    });
}

/* =========================================================
   RUNTIME CONTEXT
========================================================= */

function getRuntimeContext() {
  const context =
    getStoredContext();

  return {
    space_type:
      context.spaceType,
    workspace_id:
      context.spaceType ===
      "workspace"
        ? context.workspaceId
        : null,
    agent_id:
      context.activeAgentId ??
      null,
  };
}

function buildStreamingHeaders():
Record<string, string> {
  const headers: Record<
    string,
    string
  > = {
    "Content-Type":
      "application/json",
    Accept:
      "text/event-stream",
  };

  const token =
    getStoredToken();

  const apiKey =
    getStoredApiKey();

  const companyId =
    getStoredCompany();

  const runtime =
    getStoredContext();

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  } else if (apiKey) {
    headers["X-API-Key"] =
      apiKey;
  }

  headers["X-Space-Type"] =
    runtime.spaceType;

  headers["X-Scope-Type"] =
    runtime.spaceType;

  if (
    runtime.spaceType ===
      "workspace" &&
    runtime.workspaceId
  ) {
    headers["X-Workspace-ID"] =
      runtime.workspaceId;
  }

  if (runtime.activeAgentId) {
    headers["X-Agent-ID"] =
      runtime.activeAgentId;
  }

  if (
    companyId &&
    isNumericString(
      companyId
    )
  ) {
    headers["X-Company-ID"] =
      companyId;
  }

  return headers;
}

function buildChatPayload(
  messages: ChatMessage[],
  options: {
    sessionId: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    stream: boolean;
  }
): ChatCompletionRequest {
  const sessionId =
    options.sessionId?.trim();

  if (!sessionId) {
    throw new Error(
      "sessionId is required"
    );
  }

  const sanitizedMessages =
    sanitizeMessages(messages);

  if (
    !Array.isArray(
      sanitizedMessages
    ) ||
    sanitizedMessages.length === 0
  ) {
    throw new Error(
      "No valid messages to send"
    );
  }

  const runtime =
    getRuntimeContext();

  const payload: ChatCompletionRequest =
    {
      session_id: sessionId,
      request_id:
        crypto.randomUUID(),
      model:
        options.model ||
        DEFAULT_MODEL,
      messages:
        sanitizedMessages,
      stream: options.stream,
      temperature:
        options.temperature,
      max_tokens:
        options.max_tokens,
    };

  if (
    runtime.space_type ===
      "workspace" &&
    runtime.workspace_id
  ) {
    payload.workspace_id =
      runtime.workspace_id;
  }

  if (runtime.agent_id) {
    payload.agent_id =
      runtime.agent_id;
  }

  return payload;
}

/* =========================================================
   CHAT COMPLETION
========================================================= */

export async function createChatCompletion(
  messages: ChatMessage[],
  options: {
    sessionId: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<
  ChatCompletionResponse
> {
  if (
    !Array.isArray(
      messages
    ) ||
    messages.length === 0
  ) {
    throw new Error(
      "Messages required"
    );
  }

  try {
    const payload =
      buildChatPayload(
        messages,
        {
          ...options,
          stream: false,
        }
      );

    const response =
      await qxtChatClient.post(
        `${CHAT_API_PREFIX}/chat/completions`,
        payload,
        {
          timeout:
            REQUEST_TIMEOUT,
        }
      );

    const data =
      response?.data ?? {};

    return {
      content:
        typeof data.content ===
        "string"
          ? data.content
          : "",
      session_id:
        typeof data.session_id ===
          "string" &&
        data.session_id.trim()
          ? data.session_id
          : payload.session_id,
      model:
        typeof data.model ===
          "string" &&
        data.model.trim()
          ? data.model
          : payload.model,
      meta:
        data.meta &&
        typeof data.meta ===
          "object"
          ? data.meta
          : undefined,
      payload:
        data.payload &&
        typeof data.payload ===
          "object"
          ? data.payload
          : undefined,
      usage:
        data.usage &&
        typeof data.usage ===
          "object"
          ? data.usage
          : undefined,
      images: Array.isArray(
        data?.payload?.images
      )
        ? data.payload.images
        : [],
      videos: Array.isArray(
        data?.payload?.videos
      )
        ? data.payload.videos
        : [],
    };
  } catch (error) {
    console.error(
      "[createChatCompletion]",
      error
    );

    parseApiError(error);
  }
}

/* =========================================================
   STREAMING
========================================================= */

export async function* streamChatCompletion(
  messages: ChatMessage[],
  options: {
    sessionId: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): AsyncGenerator<
  string,
  void,
  unknown
> {
  if (
    !Array.isArray(
      messages
    ) ||
    messages.length === 0
  ) {
    throw new Error(
      "Messages required"
    );
  }

  const payload =
    buildChatPayload(
      messages,
      {
        ...options,
        stream: true,
      }
    );

  const response =
    await fetch(
      `${qxtChatClient.defaults.baseURL}${CHAT_API_PREFIX}/chat/completions`,
      {
        method: "POST",
        credentials:
          "include",
        headers:
          buildStreamingHeaders(),
        body: JSON.stringify(
          payload
        ),
      }
    );

  if (!response.ok) {
    let detail =
      `Streaming failed (${response.status})`;

    try {
      const data =
        await response.json();

      const message =
        data?.detail?.message ||
        data?.detail?.code ||
        data?.detail;

      if (
        typeof message ===
          "string" &&
        message.trim()
      ) {
        detail = message;
      }
    } catch {
      //
    }

    throw new Error(detail);
  }

  const reader =
    response.body?.getReader();

  if (!reader) {
    throw new Error(
      "No stream reader"
    );
  }

  const decoder =
    new TextDecoder();

  let buffer = "";

  while (true) {
    const {
      done,
      value,
    } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(
      value,
      {
        stream: true,
      }
    );

    const chunks =
      buffer.split("\n");

    buffer =
      chunks.pop() || "";

    for (const line of chunks) {
      if (
        !line.startsWith(
          "data:"
        )
      ) {
        continue;
      }

      const raw =
        line
          .replace(
            "data:",
            ""
          )
          .trim();

      if (
        raw === "[DONE]"
      ) {
        return;
      }

      try {
        const parsed =
          JSON.parse(raw);

        // ✅ نفس التطبيع اللي في useChatStream.ts: delta.content ممكن
        // يوصل كـ string أو كـ array [{"type":"text","text":"..."}]
        const rawContent =
          parsed?.choices?.[0]
            ?.delta?.content;
        const content =
          typeof rawContent === "string"
            ? rawContent
            : Array.isArray(rawContent)
              ? rawContent
                  .map((part: any) =>
                    typeof part === "string"
                      ? part
                      : typeof part?.text === "string"
                        ? part.text
                        : ""
                  )
                  .join("")
              : "";

        if (content) {
          yield content;
        }
      } catch (error) {
        console.warn(
          "[stream parser]",
          raw,
          error
        );
      }
    }
  }
}