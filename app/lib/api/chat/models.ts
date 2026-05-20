import { qxtApiClient } from "../core/qxtClient";

/* =========================
   Types
========================= */

export type PublicModel = {
  object?: "model";
  id: string;
  public_name: string;
  product_key: string;
  type: string;
  is_visible?: boolean;
  gen: number;
  status?: string | null;
  provider: string;
  backend_model: string;
  context_window?: number | null;
  description?: string | null;
};

type ModelsResponse = {
  object?: "list";
  data?: PublicModel[];
};

/* =========================
   Product Key Mapping
========================= */

const PRODUCT_KEY_MAP: Record<string, string> = {
  chat: "pulse",
  core: "core",
  code: "code",
  research: "research",
  vision: "vision",
  library: "library",
};

/**
 * ✅ Map frontend product_key to backend product_key
 */
function getBackendProductKey(frontendKey: string): string {
  // ✅ لو جالك backend key بالفعل سيبه
  if (frontendKey === "pulse") return "pulse";

  const backendKey = PRODUCT_KEY_MAP[frontendKey];
  return backendKey || frontendKey;
}

/* =========================
   Cache
========================= */

let cachedModels: Map<string, { data: PublicModel[]; ts: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/* =========================
   API
========================= */

export async function fetchChatModels(
  productKey: string = "chat",
  forceRefresh: boolean = false
): Promise<PublicModel[]> {
  try {
    // ✅ Check cache with TTL
    const now = Date.now();
    const cached = cachedModels.get(productKey);
    const isExpired = !cached || now - cached.ts > CACHE_TTL;

    if (!forceRefresh && !isExpired && cached) {
      console.log(`✅ Using cached models for "${productKey}" (${cached.data.length} models)`);
      return cached.data;
    }

    console.log(`\n📡 Fetching models for productKey="${productKey}"...`);

    // ✅ Map frontend key to backend key
    const backendKey = getBackendProductKey(productKey);

    console.log(`��� Request details:`, {
      frontendProductKey: productKey,
      backendProductKey: backendKey,
      endpoint: "/api/v1/models",
    });

    const res = await qxtApiClient.get<ModelsResponse>(
      "/api/v1/models",
      {
        params: { product_key: backendKey },
      }
    );
    console.log("🔥 FULL RESPONSE:", res);
    console.log("🔥 HEADERS:", res.config.headers);

    console.log(`📦 Raw response received:`, {
      status: res.status,
      dataCount: res.data?.data?.length || 0,
    });

    // ✅ Parse and validate response
    const rawData = res.data?.data || [];

    if (!Array.isArray(rawData)) {
      console.error(`❌ Invalid response format, expected array, got:`, typeof rawData);
      throw new Error("Invalid response format from API");
    }

    console.log(`✅ Got ${rawData.length} models from API`);

    // ✅ Filter and sort models
    const models = rawData
      .filter((m) => {
        // Validate required fields
        const valid =
          m.is_visible !== false &&
          typeof m.id === "string" &&
          m.id.length > 0 &&
          typeof m.public_name === "string";

        if (!valid) {
          console.warn(`⚠️ Skipping invalid model:`, {
            id: m.id,
            is_visible: m.is_visible,
            public_name: m.public_name,
          });
        }

        return valid;
      })
      .sort((a, b) => {
        // Sort by generation (descending), then by name
        if (b.gen !== a.gen) {
          return (b.gen ?? 0) - (a.gen ?? 0);
        }
        return a.public_name.localeCompare(b.public_name);
      });

    console.log(`✅ Filtered to ${models.length} valid models`);
    console.log(`🔹 Models:`, models.map((m) => `${m.id} (gen ${m.gen})`).join(", "));

    if (models.length === 0) {
      console.warn(`⚠️ No visible models found for productKey="${productKey}"`);
      throw new Error(`No models available for ${productKey}`);
    }

    // ✅ Update cache
    cachedModels.set(productKey, { data: models, ts: now });
    console.log(`💾 Cached ${models.length} models for "${productKey}"\n`);

    return models;
  } catch (err: any) {
    console.error(
      `❌ Failed to fetch models for "${productKey}":`,
      err?.message || err
    );

    // ✅ Fallback to cached version
    const cached = cachedModels.get(productKey);
    if (cached) {
      console.log(`⚠️ Falling back to cached models (${cached.data.length} models)`);
      return cached.data;
    }

    console.error(`❌ No cached models available, throwing error`);
    throw err;
  }
}

/**
 * ✅ Get single model by ID
 */
export async function getChatModel(
  modelId: string,
  productKey: string = "chat"
): Promise<PublicModel | null> {
  try {
    console.log(`🔍 Looking for model: ${modelId}`);
    const models = await fetchChatModels(productKey);

    const model = models.find((m) => m.id === modelId);

    if (!model) {
      console.warn(`⚠️ Model ${modelId} not found in ${models.length} available models`);
      return null;
    }

    console.log(`✅ Found model: ${model.public_name} (gen ${model.gen})`);
    return model;
  } catch (err) {
    console.error(`❌ Failed to get model ${modelId}:`, err);
    return null;
  }
}

/**
 * ✅ Get default model (highest generation that's visible)
 */
export async function getDefaultChatModel(
  productKey: string = "chat"
): Promise<PublicModel | null> {
  try {
    console.log(`🎯 Getting default model for "${productKey}"`);
    const models = await fetchChatModels(productKey);

    if (models.length === 0) {
      console.warn(`⚠️ No models available for ${productKey}`);
      return null;
    }

    // Models are already sorted by gen (desc), so first one is default
    const defaultModel = models[0];
    console.log(`✅ Default model: ${defaultModel.public_name} (gen ${defaultModel.gen})`);

    return defaultModel;
  } catch (err) {
    console.error(`❌ Failed to get default model for "${productKey}":`, err);
    return null;
  }
}

/**
 * ✅ Get all models for a product (already filtered by product_key)
 */
export async function getAllModelsForProduct(
  productKey: string = "chat"
): Promise<PublicModel[]> {
  try {
    console.log(`📋 Getting all models for "${productKey}"`);
    const models = await fetchChatModels(productKey);
    console.log(`✅ Got ${models.length} models for "${productKey}"`);
    return models;
  } catch (err) {
    console.error(`❌ Failed to get models for "${productKey}":`, err);
    return [];
  }
}

/**
 * ✅ Clear cache
 */
export function clearModelsCache(productKey?: string): void {
  if (productKey) {
    console.log(`🗑️ Clearing cache for "${productKey}"`);
    cachedModels.delete(productKey);
  } else {
    console.log(`🗑️ Clearing all model cache`);
    cachedModels.clear();
  }
}

/**
 * ✅ Check if model is available
 */
export async function isModelAvailable(
  modelId: string,
  productKey: string = "chat"
): Promise<boolean> {
  const model = await getChatModel(modelId, productKey);
  const available = model !== null && model.is_visible !== false;

  console.log(
    `${available ? "✅" : "❌"} Model ${modelId} is ${available ? "available" : "not available"}`
  );

  return available;
}

/**
 * ✅ Get model by ID with fallback
 */
export async function getChatModelWithFallback(
  modelId: string | null | undefined,
  productKey: string = "chat"
): Promise<PublicModel | null> {
  // Try exact model ID first
  if (modelId) {
    console.log(`🔍 Trying to get model: ${modelId}`);
    const model = await getChatModel(modelId, productKey);
    if (model) return model;
  }

  // Fall back to default
  console.log(`⚠️ Model ${modelId} not found, using default`);
  return await getDefaultChatModel(productKey);
}