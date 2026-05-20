// app/lib/core/qxtClient.ts

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

/* ======================================================
   CONSTANTS
====================================================== */

const API_BASE_URL =
  process.env
    .NEXT_PUBLIC_QXT_API_BASE_URL
    ?.trim() ||
  "http://127.0.0.1:8000";

const DEFAULT_TIMEOUT =
  30_000;

/* ======================================================
   STORAGE KEYS
====================================================== */

export const QXT_TOKEN_KEY =
  "qxt_access_token";

export const QXT_API_KEY =
  "qxt_api_key";

export const QXT_COMPANY_KEY =
  "qxt_company_id";

export const QXT_WORKSPACE_KEY =
  "qxt_workspace_id";

/* ======================================================
 CONTEXT STORAGE
====================================================== */

export const QXT_CONTEXT_KEY =
  "qxt_context";

/* ======================================================
   CONTEXT TYPES
====================================================== */

export type StoredContext = {
  workspaceId: string | null;

  environment:
  | "personal"
  | "workspace";
};

/* ======================================================
   CONTEXT HELPERS
====================================================== */

export function getStoredContext(): StoredContext {
  if (
    typeof window ===
    "undefined"
  ) {
    return {
      workspaceId: null,
      environment: "personal",
    };
  }

  try {
    const raw =
      localStorage.getItem(
        QXT_CONTEXT_KEY
      );

    if (!raw) {
      return {
        workspaceId: null,
        environment: "personal",
      };
    }

    const parsed =
      JSON.parse(raw);

    return {
      workspaceId:
        typeof parsed?.workspaceId ===
          "string"
          ? parsed.workspaceId
          : null,

      environment:
        parsed?.environment ===
          "workspace"
          ? "workspace"
          : "personal",
    };
  } catch {
    return {
      workspaceId: null,
      environment: "personal",
    };
  }
}

export function setStoredContext(
  context: Partial<StoredContext>
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const current =
    getStoredContext();

  const next: StoredContext = {
    workspaceId:
      context.workspaceId ??
      current.workspaceId ??
      null,

    environment:
      context.environment ??
      current.environment ??
      "personal",
  };

  try {
    localStorage.setItem(
      QXT_CONTEXT_KEY,
      JSON.stringify(next)
    );
  } catch {
    //
  }

  /* ============================================
     SYNC LEGACY STORAGE
  ============================================ */

  applyWorkspaceEverywhere(
    next.workspaceId
  );
}

export function clearStoredContext(): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    localStorage.removeItem(
      QXT_CONTEXT_KEY
    );
  } catch {
    //
  }

  applyWorkspaceEverywhere(
    null
  );
}

/* ======================================================
   TYPES
====================================================== */

type NullableString =
  string | null;

/* ======================================================
   STORAGE HELPERS
====================================================== */

function safeStorageGet(
  key: string
): NullableString {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    return (
      localStorage.getItem(
        key
      ) || null
    );
  } catch {
    return null;
  }
}

function safeStorageSet(
  key: string,
  value: NullableString
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    if (
      value &&
      value.trim()
    ) {
      localStorage.setItem(
        key,
        value.trim()
      );
    } else {
      localStorage.removeItem(
        key
      );
    }
  } catch {
    //
    // ignore storage errors
    //
  }
}

/* ======================================================
   TOKEN STORAGE
====================================================== */

export function getStoredToken(): NullableString {
  return safeStorageGet(
    QXT_TOKEN_KEY
  );
}

export function setStoredToken(
  token: NullableString
): void {
  safeStorageSet(
    QXT_TOKEN_KEY,
    token
  );
}

/* ======================================================
   API KEY STORAGE
====================================================== */

export function getStoredApiKey(): NullableString {
  return safeStorageGet(
    QXT_API_KEY
  );
}

export function setStoredApiKey(
  apiKey: NullableString
): void {
  safeStorageSet(
    QXT_API_KEY,
    apiKey
  );
}

/* ======================================================
   COMPANY STORAGE
====================================================== */

export function getStoredCompany(): NullableString {
  return safeStorageGet(
    QXT_COMPANY_KEY
  );
}

export function setStoredCompany(
  companyId: NullableString
): void {
  safeStorageSet(
    QXT_COMPANY_KEY,
    companyId
  );
}

/* ======================================================
   WORKSPACE STORAGE
====================================================== */

export function getStoredWorkspace(): NullableString {
  return safeStorageGet(
    QXT_WORKSPACE_KEY
  );
}

export function setStoredWorkspace(
  workspaceId: NullableString
): void {
  safeStorageSet(
    QXT_WORKSPACE_KEY,
    workspaceId
  );
}

/* ======================================================
   VALIDATORS
====================================================== */

function normalizeValue(
  value: NullableString
): NullableString {
  if (!value) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
}

function isValidUuid(
  value: NullableString
): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

/* ======================================================
   HEADER HELPERS
====================================================== */

function clearHeader(
  client: AxiosInstance,
  headerName: string
): void {
  try {
    delete (
      client.defaults.headers
        .common as Record<
          string,
          unknown
        >
    )[headerName];
  } catch {
    //
  }
}

/* ======================================================
   AXIOS FACTORY
====================================================== */

function createClient() {
  return axios.create({
    baseURL:
      API_BASE_URL,

    timeout:
      DEFAULT_TIMEOUT,

    withCredentials: false,

    headers: {
      "Content-Type":
        "application/json",
    },
  });
}

/* ======================================================
   CLIENTS
====================================================== */

export const qxtAuthClient =
  createClient();

export const qxtChatClient =
  createClient();

export const qxtApiClient =
  createClient();

/* ======================================================
   ENV API KEY
====================================================== */

const ENV_API_KEY =
  normalizeValue(
    process.env
      .NEXT_PUBLIC_QXT_API_KEY ||
    null
  );

if (ENV_API_KEY) {
  qxtApiClient.defaults.headers.common[
    "X-API-Key"
  ] = ENV_API_KEY;
}

/* ======================================================
   TOKEN HELPERS
====================================================== */

function applyAuthHeader(
  client: AxiosInstance,
  token: NullableString
): void {
  const normalized =
    normalizeValue(token);

  if (normalized) {
    client.defaults.headers.common.Authorization =
      `Bearer ${normalized}`;
  } else {
    clearHeader(
      client,
      "Authorization"
    );
  }
}

export function applyTokenEverywhere(
  token: NullableString
): void {
  setStoredToken(token);

  const clients = [
    qxtAuthClient,
    qxtChatClient,
    qxtApiClient,
  ];

  for (const client of clients) {
    applyAuthHeader(
      client,
      token
    );
  }
}

/* ======================================================
   API KEY HELPERS
====================================================== */

export function setApiKeyHeader(
  apiKey: NullableString
): void {
  setStoredApiKey(
    apiKey
  );

  const normalized =
    normalizeValue(
      apiKey
    );

  const clients = [
    qxtAuthClient,
    qxtChatClient,
    qxtApiClient,
  ];

  for (const client of clients) {
    if (normalized) {
      client.defaults.headers.common[
        "X-API-Key"
      ] = normalized;
    } else {
      clearHeader(
        client,
        "X-API-Key"
      );
    }
  }
}

/* ======================================================
   COMPANY HELPERS
====================================================== */

export function applyCompanyEverywhere(
  companyId: NullableString
): void {
  const normalized =
    normalizeValue(
      companyId
    );

  const clients = [
    qxtAuthClient,
    qxtChatClient,
    qxtApiClient,
  ];

  if (!normalized) {
    setStoredCompany(
      null
    );

    for (const client of clients) {
      clearHeader(
        client,
        "X-Company-Id"
      );
    }

    return;
  }

  if (
    !isValidUuid(
      normalized
    )
  ) {
    console.warn(
      "[Company] Invalid company id:",
      normalized
    );

    return;
  }

  setStoredCompany(
    normalized
  );

  for (const client of clients) {
    client.defaults.headers.common[
      "X-Company-Id"
    ] = normalized;
  }
}

/* ======================================================
   WORKSPACE HELPERS
====================================================== */

export function applyWorkspaceEverywhere(
  workspaceId: NullableString
): void {
  const normalized =
    normalizeValue(
      workspaceId
    );

  const clients = [
    qxtAuthClient,
    qxtChatClient,
    qxtApiClient,
  ];

  if (!normalized) {
    setStoredWorkspace(
      null
    );

    for (const client of clients) {
      clearHeader(
        client,
        "X-Workspace-Id"
      );
    }

    return;
  }

  if (
    !isValidUuid(
      normalized
    )
  ) {
    console.warn(
      "[Workspace] Invalid workspace id:",
      normalized
    );

    return;
  }

  setStoredWorkspace(
    normalized
  );

  for (const client of clients) {
    client.defaults.headers.common[
      "X-Workspace-Id"
    ] = normalized;
  }
}

/* ======================================================
   LOGIN / LOGOUT
====================================================== */

export function loginSideEffects(
  token: string
): void {
  applyCompanyEverywhere(
    null
  );

  applyWorkspaceEverywhere(
    null
  );

  applyTokenEverywhere(
    token
  );
}

export function logoutSideEffects(): void {
  applyTokenEverywhere(
    null
  );

  setApiKeyHeader(
    null
  );

  applyCompanyEverywhere(
    null
  );

  applyWorkspaceEverywhere(
    null
  );
}

/* ======================================================
   REQUEST INTERCEPTOR
====================================================== */

function attachAuth(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  config.headers =
    config.headers || {};

  // ====================================================
  // TOKEN
  // ====================================================

  const token =
    normalizeValue(
      getStoredToken()
    );

  if (token) {
    config.headers.Authorization =
      `Bearer ${token}`;

    delete config.headers[
      "X-API-Key"
    ];
  } else {
    const apiKey =
      normalizeValue(
        getStoredApiKey() ||
        ENV_API_KEY
      );

    if (apiKey) {
      config.headers[
        "X-API-Key"
      ] = apiKey;
    }
  }

  // ====================================================
  // COMPANY
  // ====================================================

  const companyId =
    normalizeValue(
      getStoredCompany()
    );

  if (
    companyId &&
    isValidUuid(
      companyId
    )
  ) {
    config.headers[
      "X-Company-Id"
    ] = companyId;
  }

  // ====================================================
  // WORKSPACE
  // ====================================================

  const workspaceId =
    normalizeValue(
      getStoredWorkspace()
    );

  if (
    workspaceId &&
    isValidUuid(
      workspaceId
    )
  ) {
    config.headers[
      "X-Workspace-Id"
    ] = workspaceId;
  }

  return config;
}

/* ======================================================
   RESPONSE INTERCEPTOR
====================================================== */

function shouldLogoutOn401(
  error: AxiosError
): boolean {
  const status =
    error.response
      ?.status;

  if (status !== 401) {
    return false;
  }

  const token =
    getStoredToken();

  if (!token) {
    return false;
  }

  const url = String(
    error.config?.url ||
    ""
  );

  return !url.includes(
    "/api/v1/auth/logout"
  );
}

function handleResponseError(
  error: AxiosError
) {
  const status =
    error.response
      ?.status;

  // ====================================================
  // AUTO LOGOUT
  // ====================================================

  if (
    shouldLogoutOn401(
      error
    )
  ) {
    logoutSideEffects();
  }

  // ====================================================
  // WORKSPACE INVALID
  // ====================================================

  if (
    status === 400
  ) {
    const code =
      (
        error.response
          ?.data as any
      )?.detail?.code;

    if (
      code ===
      "WORKSPACE_REQUIRED"
    ) {
      console.error(
        "[Workspace] Missing active workspace"
      );
    }
  }

  return Promise.reject(
    error
  );
}

/* ======================================================
   ATTACH INTERCEPTORS
====================================================== */

const clients = [
  qxtAuthClient,
  qxtChatClient,
  qxtApiClient,
];

for (const client of clients) {
  client.interceptors.request.use(
    attachAuth
  );

  client.interceptors.response.use(
    (response) =>
      response,
    handleResponseError
  );
}

/* ======================================================
   WORKSPACE BOOTSTRAP
====================================================== */

let workspaceBootstrapPromise:
  | Promise<string | null>
  | null = null;

export async function ensureWorkspaceLoaded(): Promise<string | null> {
  // ====================================================
  // EXISTING
  // ====================================================

  const existing =
    normalizeValue(
      getStoredWorkspace()
    );

  if (
    existing &&
    isValidUuid(
      existing
    )
  ) {
    return existing;
  }

  // ====================================================
  // TOKEN REQUIRED
  // ====================================================

  const token =
    normalizeValue(
      getStoredToken()
    );

  if (!token) {
    return null;
  }

  // ====================================================
  // DEDUPE
  // ====================================================

  if (
    workspaceBootstrapPromise
  ) {
    return workspaceBootstrapPromise;
  }

  // ====================================================
  // LOAD
  // ====================================================

  workspaceBootstrapPromise =
    (async () => {
      try {
        const response =
          await qxtChatClient.get(
            "/api/v1/workspaces"
          );

        const raw =
          response.data;

        const workspaces =
          raw?.items ||
          [];

        if (
          !Array.isArray(
            workspaces
          ) ||
          !workspaces.length
        ) {
          console.warn(
            "[Workspace] No workspaces available"
          );

          return null;
        }

        const first =
          workspaces[0];

        const workspaceId =
          normalizeValue(
            String(
              first.id
            )
          );

        if (
          !workspaceId ||
          !isValidUuid(
            workspaceId
          )
        ) {
          console.error(
            "[Workspace] Invalid workspace returned"
          );

          return null;
        }

        // ================================================
        // ACTIVATE
        // ================================================

        try {
          await qxtChatClient.post(
            `/api/v1/workspaces/${workspaceId}/activate`
          );
        } catch (
        activationError
        ) {
          console.warn(
            "[Workspace] Activation failed",
            activationError
          );
        }

        applyWorkspaceEverywhere(
          workspaceId
        );

        console.log(
          "[Workspace] Active:",
          workspaceId
        );

        return workspaceId;
      } catch (error) {
        console.error(
          "[Workspace] Bootstrap failed",
          error
        );

        return null;
      } finally {
        workspaceBootstrapPromise =
          null;
      }
    })();

  return workspaceBootstrapPromise;
}

/* ======================================================
   INITIAL HYDRATION
====================================================== */

if (
  typeof window !==
  "undefined"
) {
  const token =
    getStoredToken();

  const apiKey =
    getStoredApiKey();

  const companyId =
    getStoredCompany();

  const workspaceId =
    getStoredWorkspace();

  if (token) {
    applyTokenEverywhere(
      token
    );
  }

  if (apiKey) {
    setApiKeyHeader(
      apiKey
    );
  }

  if (companyId) {
    applyCompanyEverywhere(
      companyId
    );
  }

  if (workspaceId) {
    applyWorkspaceEverywhere(
      workspaceId
    );
  }
}