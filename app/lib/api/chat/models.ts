import axios, {
  AxiosError,
} from "axios";

import {
  qxtApiClient,
  getStoredContext,
} from "../core/qxtClient";

/* =========================================================
   TYPES
========================================================= */

export type ProductKey =
  | "chat"
  | "core"
  | "code"
  | "research"
  | "vision"
  | "library";

export type PublicModelGeneration = {
  gen: number;
  minor: number;
  label: string;
};

export type PublicModel = {
  object?: "model";
  id: string;
  public_name: string;
  product_key: string;
  type: string;
  is_visible?: boolean;
  active_gen_id?: string;
  gen: number;
  status?: string | null;
  provider: string;
  backend_model: string;
  context_window?: number | null;
  description?: string | null;
  generation?: PublicModelGeneration;
  config?: Record<
    string,
    any
  >;
};

type ModelsResponse = {
  object?: "list";
  data?: PublicModel[];
};

/* =========================================================
   CONSTANTS
========================================================= */

const CACHE_TTL =
  1000 * 60 * 5;

const MAX_CACHE_SIZE =
  25;

const REQUEST_TIMEOUT = 18000;

const FALLBACK_MODELS:
  PublicModel[] = [
  {
    id: "pulse-core",
    object: "model",
    public_name:
      "Pulse Core",
    product_key:
      "chat",
    type: "chat",
    is_visible: true,
    gen: 1,
    status: "active",
    provider: "pulse",
    backend_model:
      "pulse-core",
    context_window:
      128000,
    description:
      "Default fallback model",
    generation: {
      gen: 1,
      minor: 0,
      label: "G1.0",
    },
  },
];

/* =========================================================
   PRODUCT MAP
========================================================= */

const PRODUCT_KEY_MAP: Record<
  ProductKey,
  string
> = {
  chat: "pulse",
  core: "core",
  code: "code",
  research: "research",
  vision: "vision",
  library: "library",
};

/* =========================================================
   CACHE
========================================================= */

type CacheEntry = {
  data: PublicModel[];
  ts: number;
};

const cachedModels =
  new Map<
    string,
    CacheEntry
  >();

const inflightRequests =
  new Map<
    string,
    Promise<PublicModel[]>
  >();

/* =========================================================
   HELPERS
========================================================= */

function getBackendProductKey(
  frontendKey:
    | ProductKey
    | string
): string {
  if (
    !frontendKey?.trim()
  ) {
    return "pulse";
  }

  const typedKey =
    frontendKey as ProductKey;

  return (
    PRODUCT_KEY_MAP[
      typedKey
    ] || frontendKey
  );
}

function buildCacheKey(
  productKey: string,
  backendKey: string
): string {
  const runtime =
    getStoredContext();

  return [
    runtime.spaceType,
    runtime.workspaceId ||
      "none",
    runtime.activeAgentId ||
      "none",
    productKey,
    backendKey,
  ].join(":");
}

function isCacheExpired(
  ts: number
): boolean {
  return (
    Date.now() - ts >
    CACHE_TTL
  );
}

function cleanupCache(): void {
  if (
    cachedModels.size <=
    MAX_CACHE_SIZE
  ) {
    return;
  }

  const oldestKey =
    cachedModels.keys().next()
      .value;

  if (oldestKey) {
    cachedModels.delete(
      oldestKey
    );
  }
}

function validateModel(
  model: unknown
): model is PublicModel {
  if (
    !model ||
    typeof model !==
      "object"
  ) {
    return false;
  }

  const m =
    model as PublicModel;

  return (
    typeof m.id ===
      "string" &&
    m.id.length > 0 &&
    typeof m.public_name ===
      "string" &&
    typeof m.product_key ===
      "string" &&
    typeof m.type ===
      "string" &&
    typeof m.provider ===
      "string" &&
    typeof m.backend_model ===
      "string" &&
    m.is_visible !== false
  );
}

function sortModels(
  a: PublicModel,
  b: PublicModel
): number {
  return (
    (b.gen ?? 0) -
      (a.gen ?? 0) ||
    a.public_name.localeCompare(
      b.public_name
    ) ||
    a.id.localeCompare(
      b.id
    )
  );
}

function normalizeModel(
  model: PublicModel
): PublicModel {
  const gen =
    Number(
      model.gen || 1
    );

  const minor =
    Number(
      model.generation
        ?.minor || 0
    );

  return {
    ...model,
    object:
      model.object ||
      "model",
    public_name:
      model.public_name ||
      model.id,
    provider:
      model.provider ||
      "unknown",
    backend_model:
      model.backend_model ||
      "unknown",
    generation:
      model.generation || {
        gen,
        minor,
        label: `G${gen}.${minor}`,
      },
  };
}

function cloneModels(
  models: PublicModel[]
): PublicModel[] {
  return models.map(
    (model) => ({
      ...model,
      generation:
        model.generation
          ? {
              ...model.generation,
            }
          : undefined,
      config:
        model.config
          ? {
              ...model.config,
            }
          : undefined,
    })
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

    switch (status) {
      case 401:
        throw new Error(
          "Unauthorized"
        );

      case 403:
        throw new Error(
          "Forbidden"
        );

      case 404:
        throw new Error(
          "Models endpoint not found"
        );

      case 429:
        throw new Error(
          "Rate limit exceeded"
        );

      case 500:
        throw new Error(
          "Internal server error"
        );

      default:
        throw new Error(
          message ||
            "Failed to fetch models"
        );
    }
  }

  throw error;
}

/* =========================================================
   FETCH MODELS
========================================================= */

export async function fetchChatModels(
  productKey:
    | ProductKey
    | string = "chat",
  forceRefresh: boolean = false,
  signal?: AbortSignal
): Promise<
  PublicModel[]
> {
  const backendKey =
    getBackendProductKey(
      productKey
    );

  const cacheKey =
    buildCacheKey(
      productKey,
      backendKey
    );

  const cached =
    cachedModels.get(
      cacheKey
    );

  const expired =
    !cached ||
    isCacheExpired(
      cached.ts
    );

  if (
    !forceRefresh &&
    cached &&
    !expired
  ) {
    return cloneModels(
      cached.data
    );
  }

  const inflight =
    inflightRequests.get(
      cacheKey
    );

  if (
    inflight &&
    !forceRefresh
  ) {
    return inflight;
  }

  const request =
    (async (): Promise<
      PublicModel[]
    > => {
      try {
        const runtime =
          getStoredContext();

        const response =
          await qxtApiClient.get<ModelsResponse>(
            "/api/v1/models",
            {
              params: {
                product_key:
                  backendKey,
                workspace_id:
                  runtime.spaceType ===
                  "workspace"
                    ? runtime.workspaceId
                    : null,
                agent_id:
                  runtime.activeAgentId ??
                  null,
              },
              timeout:
                REQUEST_TIMEOUT,
              signal,
            }
          );

        const rawData =
          response.data
            ?.data ?? [];

        if (
          !Array.isArray(
            rawData
          )
        ) {
          return cloneModels(
            FALLBACK_MODELS
          );
        }

        const models =
          rawData
            .filter(
              validateModel
            )
            .map(
              normalizeModel
            )
            .sort(
              sortModels
            );

        if (
          models.length === 0
        ) {
          return cloneModels(
            FALLBACK_MODELS
          );
        }

        cleanupCache();

        cachedModels.set(
          cacheKey,
          {
            data: models,
            ts: Date.now(),
          }
        );

        return cloneModels(
          models
        );
      } catch (error) {
        const fallback =
          cachedModels.get(
            cacheKey
          );

        if (
          fallback?.data
            ?.length
        ) {
          return cloneModels(
            fallback.data
          );
        }

        if (
          productKey ===
          "chat"
        ) {
          return cloneModels(
            FALLBACK_MODELS
          );
        }

        parseApiError(
          error
        );
      } finally {
        inflightRequests.delete(
          cacheKey
        );
      }
    })();

  inflightRequests.set(
    cacheKey,
    request
  );

  return request;
}

/* =========================================================
   GET MODEL
========================================================= */

export async function getChatModel(
  modelId: string,
  productKey:
    | ProductKey
    | string = "chat"
): Promise<
  PublicModel | null
> {
  try {
    if (
      !modelId?.trim()
    ) {
      return null;
    }

    const models =
      await fetchChatModels(
        productKey
      );

    return (
      models.find(
        (model) =>
          model.id ===
          modelId
      ) || null
    );
  } catch {
    return null;
  }
}

/* =========================================================
   DEFAULT MODEL
========================================================= */

export async function getDefaultChatModel(
  productKey:
    | ProductKey
    | string = "chat"
): Promise<
  PublicModel | null
> {
  try {
    const models =
      await fetchChatModels(
        productKey
      );

    return (
      models[0] || null
    );
  } catch {
    return (
      FALLBACK_MODELS[0] ||
      null
    );
  }
}

/* =========================================================
   GET ALL
========================================================= */

export async function getAllModelsForProduct(
  productKey:
    | ProductKey
    | string = "chat"
): Promise<
  PublicModel[]
> {
  try {
    return await fetchChatModels(
      productKey
    );
  } catch {
    return cloneModels(
      FALLBACK_MODELS
    );
  }
}

/* =========================================================
   CHECK MODEL
========================================================= */

export async function isModelAvailable(
  modelId: string,
  productKey:
    | ProductKey
    | string = "chat"
): Promise<boolean> {
  const model =
    await getChatModel(
      modelId,
      productKey
    );

  return (
    model !== null &&
    model.is_visible !==
      false
  );
}

/* =========================================================
   MODEL WITH FALLBACK
========================================================= */

export async function getChatModelWithFallback(
  modelId:
    | string
    | null
    | undefined,
  productKey:
    | ProductKey
    | string = "chat"
): Promise<
  PublicModel | null
> {
  if (modelId) {
    const model =
      await getChatModel(
        modelId,
        productKey
      );

    if (model) {
      return model;
    }
  }

  return getDefaultChatModel(
    productKey
  );
}

/* =========================================================
   CACHE CONTROL
========================================================= */

export function clearModelsCache(
  productKey?:
    | ProductKey
    | string
): void {
  if (!productKey) {
    cachedModels.clear();
    inflightRequests.clear();
    return;
  }

  const backendKey =
    getBackendProductKey(
      productKey
    );

  const cacheKey =
    buildCacheKey(
      productKey,
      backendKey
    );

  cachedModels.delete(
    cacheKey
  );

  inflightRequests.delete(
    cacheKey
  );
}