import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

/* =========================================================
   CONFIG
========================================================= */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_QXT_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const DEFAULT_TIMEOUT = 30_000;
const RETRY_BASE_DELAY = 1_000;
const MAX_RETRIES = 4;

/* =========================================================
   STORAGE KEYS
========================================================= */

export const QXT_TOKEN_KEY        = "qxt_access_token";
export const QXT_API_KEY          = "qxt_api_key";
export const QXT_WORKSPACE_KEY    = "qxt_workspace_id";
export const QXT_COMPANY_KEY      = "qxt_company_id";
export const QXT_CONTEXT_KEY      = "qxt_runtime_context";
export const QXT_LAST_SESSION_KEY = "qxt_last_session_id";

/* =========================================================
   TYPES
========================================================= */

type NullableString = string | null;

export type SpaceType = "personal" | "workspace";

export type LegacyRuntimeScopeType = "personal" | "workspace" | "agent";

export type StoredContext = {
  spaceType?:     SpaceType;
  workspaceId?:   string | null;
  activeAgentId?: string | null;
  companyId?:     string | number | null;
  // backward compat
  scopeType?: LegacyRuntimeScopeType;
  agentId?:   string | null;
};

export type NormalizedStoredContext = {
  spaceType:     SpaceType;
  workspaceId:   string | null;
  activeAgentId: string | null;
  companyId:     string | null;
};

type RetryableConfig = InternalAxiosRequestConfig & {
  __retryCount?: number;
  __client?:     AxiosInstance;
};

/* =========================================================
   DEFAULT CONTEXT
========================================================= */

const DEFAULT_CONTEXT: Readonly<NormalizedStoredContext> = {
  spaceType:     "personal",
  workspaceId:   null,
  activeAgentId: null,
  companyId:     null,
};

/* =========================================================
   STORAGE HELPERS
========================================================= */

function storageGet(key: string): NullableString {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: NullableString): void {
  if (typeof window === "undefined") return;
  try {
    if (value && value.trim()) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch { /* ignore */ }
}

/* =========================================================
   NORMALIZE
========================================================= */

function normalize(value: NullableString): NullableString {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeUnknownString(value: unknown): NullableString {
  if (value === null || value === undefined) return null;
  return normalize(String(value));
}

function normalizeSpaceType(value: unknown): SpaceType {
  return value === "workspace" ? "workspace" : "personal";
}

function normalizeStoredContext(
  raw: StoredContext | null | undefined
): NormalizedStoredContext {
  if (!raw) {
    return { ...DEFAULT_CONTEXT, companyId: getStoredCompany() };
  }

  const legacySpaceType: SpaceType =
    raw.scopeType === "workspace" ? "workspace" : "personal";

  return {
    spaceType:     normalizeSpaceType(raw.spaceType ?? legacySpaceType),
    workspaceId:   normalize(raw.workspaceId ?? null),
    activeAgentId: normalize(raw.activeAgentId ?? raw.agentId ?? null),
    companyId:     normalizeUnknownString(raw.companyId ?? getStoredCompany()),
  };
}

/* =========================================================
   VALIDATION
========================================================= */

function isUuid(value: NullableString): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isNumericString(value: NullableString): boolean {
  if (!value) return false;
  return /^\d+$/.test(value.trim());
}

/* =========================================================
   TOKEN
========================================================= */

export function getStoredToken(): NullableString {
  return normalize(storageGet(QXT_TOKEN_KEY));
}

export function setStoredToken(token: NullableString): void {
  storageSet(QXT_TOKEN_KEY, normalize(token));
}

/* =========================================================
   API KEY
========================================================= */

export function getStoredApiKey(): NullableString {
  return normalize(storageGet(QXT_API_KEY));
}

export function setStoredApiKey(apiKey: NullableString): void {
  storageSet(QXT_API_KEY, normalize(apiKey));
}

/* =========================================================
   WORKSPACE
========================================================= */

export function getStoredWorkspace(): NullableString {
  return normalize(storageGet(QXT_WORKSPACE_KEY));
}

export function setStoredWorkspace(workspaceId: NullableString): void {
  storageSet(QXT_WORKSPACE_KEY, normalize(workspaceId));
}

/* =========================================================
   COMPANY
========================================================= */

export function getStoredCompany(): NullableString {
  return normalize(storageGet(QXT_COMPANY_KEY));
}

export function setStoredCompany(companyId: NullableString): void {
  storageSet(QXT_COMPANY_KEY, normalize(companyId));
}

/* =========================================================
   LAST SESSION
========================================================= */

export function getStoredLastSession(): NullableString {
  return normalize(storageGet(QXT_LAST_SESSION_KEY));
}

export function setStoredLastSession(sessionId: NullableString): void {
  storageSet(QXT_LAST_SESSION_KEY, normalize(sessionId));
}

/* =========================================================
   RUNTIME CONTEXT
========================================================= */

export function getStoredContext(): NormalizedStoredContext {
  try {
    const raw = storageGet(QXT_CONTEXT_KEY);
    if (!raw) return { ...DEFAULT_CONTEXT, companyId: getStoredCompany() };
    const parsed = JSON.parse(raw) as StoredContext;
    return normalizeStoredContext(parsed);
  } catch {
    return { ...DEFAULT_CONTEXT, companyId: getStoredCompany() };
  }
}

export function setStoredContext(context: StoredContext): void {
  try {
    const normalized = normalizeStoredContext(context);

    const persisted: StoredContext = {
      spaceType:     normalized.spaceType,
      workspaceId:   normalized.workspaceId,
      activeAgentId: normalized.activeAgentId,
      companyId:     normalized.companyId,
      // backward compat
      scopeType: normalized.spaceType,
      agentId:   normalized.activeAgentId,
    };

    storageSet(QXT_CONTEXT_KEY, JSON.stringify(persisted));
    setStoredWorkspace(normalized.workspaceId);
    setStoredCompany(normalized.companyId);
  } catch { /* ignore */ }
}

export function clearStoredContext(): void {
  storageSet(QXT_CONTEXT_KEY, null);
  setStoredWorkspace(null);
  setStoredCompany(null);
}

/* =========================================================
   AXIOS CLIENT FACTORY
========================================================= */

function createClient(timeout = DEFAULT_TIMEOUT): AxiosInstance {
  return axios.create({
    baseURL:         API_BASE_URL,
    timeout,
    withCredentials: true,
    headers: {
      Accept:         "application/json",
      "Content-Type": "application/json",
    },
  });
}

/* =========================================================
   CLIENTS
========================================================= */

export const qxtApiClient  = createClient(15_000);
export const qxtAuthClient = createClient(15_000);
export const qxtChatClient = createClient(60_000);

/* =========================================================
   AUTH HEADER INJECTOR
========================================================= */

function attachAuthHeaders(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  config.headers = config.headers || {};

  const url = config.url || "";

  // Public auth endpoints must never inherit stale authentication.
  const isPublicAuthEndpoint =
    url.includes("/api/v1/auth/login") ||
    url.includes("/api/v1/auth/register");

  if (isPublicAuthEndpoint) {
    delete config.headers.Authorization;
    delete config.headers["X-API-Key"];
    return config;
  }

  const token   = getStoredToken();
  const apiKey  = getStoredApiKey();
  const runtime = getStoredContext();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (apiKey) {
    config.headers["X-API-Key"] = apiKey;
  }

  config.headers["X-Space-Type"] = runtime.spaceType;
  config.headers["X-Scope-Type"] = runtime.spaceType;

  if (runtime.spaceType === "workspace" && isUuid(runtime.workspaceId)) {
    config.headers["X-Workspace-ID"] = runtime.workspaceId;
  }

  if (isUuid(runtime.activeAgentId)) {
    config.headers["X-Agent-ID"] = runtime.activeAgentId;
  }

  if (isNumericString(runtime.companyId)) {
    config.headers["X-Company-ID"] = runtime.companyId;
  }

  return config;
}

/* =========================================================
   RETRY
========================================================= */

function isRetryEligible(config?: RetryableConfig): boolean {
  if (!config) return false;

  const method = (config.method || "get").toLowerCase();
  const url    = config.url || "";

  if (method !== "get") return false;

  // حاجات حساسة ما تتعادش
  if (
    url.includes("/api/v1/auth/me") ||
    url.includes("/api/v1/business/me")
  ) return false;

  return true;
}

async function retryRequest(error: AxiosError): Promise<never> {
  const config = error.config as RetryableConfig | undefined;

  if (!config || !isRetryEligible(config)) {
    return Promise.reject(error);
  }

  config.__retryCount = config.__retryCount || 0;

  if (config.__retryCount >= MAX_RETRIES) {
    return Promise.reject(error);
  }

  config.__retryCount += 1;

  // 1s → 2s → 4s → 8s
  const delay =
    RETRY_BASE_DELAY *
    Math.pow(2, config.__retryCount - 1);

  // If the browser is offline, don't waste retries while offline.
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !navigator.onLine
  ) {
    await new Promise<void>((resolve) => {
      const handleOnline = () => {
        window.removeEventListener("online", handleOnline);
        resolve();
      };

      window.addEventListener("online", handleOnline, {
        once: true,
      });
    });
  } else {
    await new Promise((resolve) =>
      setTimeout(resolve, delay)
    );
  }

  const client =
    config.__client || qxtApiClient;

  return client(config);
}

/* =========================================================
   ERROR HANDLER  ← واحدة بس، صح
========================================================= */

function handleError(error: AxiosError): Promise<never> {
  const status = error.response?.status;
  const url    = error.config?.url || "";

  // 401 على auth endpoints فقط = logout
  if (
    status === 401 &&
    (
      url.includes("/api/v1/auth/me") ||
      url.includes("/api/v1/auth/context")
    )
  ) {
    logoutSideEffects();
  }

  // Timeout
  if (
  error.code === "ECONNABORTED" ||
  error.code === "ETIMEDOUT"
) {
  if (!url.includes("/api/v1/auth/me")) {
    console.error("[API TIMEOUT]", url);
  }

  return retryRequest(error);
}

  // Network error - retry
 if (!error.response) {
  console.error("[NETWORK ERROR]", {
    url,
    baseURL: error.config?.baseURL,
    method: error.config?.method,
    code: error.code,
    message: error.message,
  });

  return retryRequest(error);
}

  // كل الأخطاء التانية ما عدا 401 على /me
  if (!(status === 401 && url.includes("/api/v1/auth/me"))) {
    console.error("[API ERROR]", { status, url, data: error.response?.data });
  }

  return Promise.reject(error);
}

/* =========================================================
   ATTACH INTERCEPTORS
========================================================= */

for (const client of [qxtApiClient, qxtAuthClient, qxtChatClient]) {
  client.interceptors.request.use((config) => {
    const retryable = config as RetryableConfig;
    retryable.__client = client;
    return attachAuthHeaders(retryable);
  });

  client.interceptors.response.use(
    (response) => response,
    handleError
  );
}

/* =========================================================
   AUTH SIDE EFFECTS
========================================================= */

export function loginSideEffects(token: string): void {
  setStoredToken(token);
  // ✅ مش بنعمل reset للـ context - الـ workspace يتحمل بعدين
}

export function logoutSideEffects(): void {
  setStoredToken(null);
  setStoredApiKey(null);
  setStoredLastSession(null);  // ✅ قبل clearStoredContext
  setStoredWorkspace(null);
  setStoredCompany(null);
  clearStoredContext();
  workspacePromise = null;
}

/* =========================================================
   WORKSPACE BOOTSTRAP
========================================================= */

let workspacePromise: Promise<string | null> | null = null;

export async function ensureWorkspaceLoaded(): Promise<string | null> {
  const runtime = getStoredContext();

  // Personal space - مش محتاج workspace
  if (runtime.spaceType === "personal") return null;

  // عندنا workspace valid - رجعه مباشرة
  if (runtime.workspaceId && isUuid(runtime.workspaceId)) {
    return runtime.workspaceId;
  }

  // Singleton promise - امنع double fetch
  if (workspacePromise) return workspacePromise;

  workspacePromise = (async () => {
    try {
      const response = await qxtApiClient.get("/api/v1/workspaces", {
        timeout: 12_000,
      });

      const raw   = response.data;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      if (!items.length) return null;

      const workspaceId = normalize(String(items[0]?.id));
      if (!workspaceId || !isUuid(workspaceId)) return null;

      setStoredContext({
        spaceType:     "workspace",
        workspaceId,
        activeAgentId: null,
        companyId:     normalizeUnknownString(items[0]?.company_id) ?? getStoredCompany(),
      });

      return workspaceId;
    } catch (error) {
      console.error("[WORKSPACE BOOTSTRAP FAILED]", error);
      return null;
    } finally {
      workspacePromise = null;
    }
  })();

  return workspacePromise;
}

/* =========================================================
   APPLY WORKSPACE EVERYWHERE
========================================================= */

// Used right after OAuth login / workspace activation: persists the
// workspace id via setStoredContext (which also updates the legacy
// QXT_WORKSPACE_KEY) AND sets it on the shared axios clients' default
// headers immediately — so the very next request fired, even before
// any component re-renders, already carries X-Workspace-ID, instead
// of waiting for attachAuthHeaders to pick it up from storage later.
export function applyWorkspaceEverywhere(workspaceId: string): void {
  setStoredContext({
    spaceType: "workspace",
    workspaceId,
    activeAgentId: null,
    companyId: getStoredCompany(),
  });

  for (const client of [qxtApiClient, qxtAuthClient, qxtChatClient]) {
    client.defaults.headers.common["X-Workspace-ID"] = workspaceId;
  }
}