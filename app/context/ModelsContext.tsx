// app/context/ModelsContext.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchChatModels } from "../lib/api/chat/models";

export type ProductKey =
  | "core"
  | "chat"
  | "code"
  | "research"
  | "vision"
  | "library";

export type PublicModelItem = {
  object?: string;
  id: string;
  public_name: string;
  product_key: string;
  type: string;
  gen: number;
  status?: string;
  is_visible?: boolean;
  provider?: string;
  backend_model?: string;
  context_window?: number | null;
  description?: string | null;
  config?: Record<string, any>;
};

export type SelectedModel = { id: string; gen: number };

type ModelsState = {
  loading: boolean;
  error: string | null;
  models: PublicModelItem[];
  modelsByProduct: Record<ProductKey, PublicModelItem[]>;
  selected: SelectedModel | null;
  selectModel: (id: string, gen?: number) => void;
  setGen: (gen: number) => void;
  refresh: () => Promise<void>;
  label: string;
};

const Ctx = createContext<ModelsState | null>(null);

const LS_KEY = "qxt_selected_model_v1";

// ✅ Map backend product_key to frontend ProductKey
const mapProductKey = (backendKey: string): ProductKey | null => {
  if (backendKey === "pulse") return "chat";
  if (["core", "code", "research", "vision", "library"].includes(backendKey)) {
    return backendKey as ProductKey;
  }
  console.warn(`⚠️ Unknown product_key: ${backendKey}`);
  return null;
};

// ✅ Clamp generation to 1-3
function clampGen(gen: number): number {
  return Math.max(1, Math.min(3, gen));
}

// ✅ Safe JSON parse
function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// ✅ Load saved model selection from localStorage
function loadSavedSelection(productKey: ProductKey): SelectedModel | null {
  if (typeof window === "undefined") return null;

  console.log(`📖 Loading saved selection for "${productKey}"`);

  const all = safeParse<Record<string, SelectedModel>>(
    localStorage.getItem(LS_KEY)
  );

  const v = all?.[productKey];
  if (!v?.id) {
    console.log(`⚠️ No saved selection found for "${productKey}"`);
    return null;
  }

  const saved: SelectedModel = {
    id: String(v.id),
    gen: clampGen(Number(v.gen ?? 1)),
  };

  console.log(`✅ Loaded saved selection:`, saved);
  return saved;
}

// ✅ Save model selection to localStorage
function saveSelection(
  productKey: ProductKey,
  sel: SelectedModel | null
): void {
  if (typeof window === "undefined") return;

  console.log(`💾 Saving selection for "${productKey}":`, sel);

  const all =
    safeParse<Record<string, SelectedModel>>(localStorage.getItem(LS_KEY)) ||
    {};

  if (!sel) {
    delete all[productKey];
    console.log(`🗑️ Cleared selection for "${productKey}"`);
  } else {
    all[productKey] = {
      id: String(sel.id),
      gen: clampGen(Number(sel.gen ?? 1)),
    };
    console.log(`✅ Selection saved for "${productKey}"`);
  }

  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

export function ModelsProvider({
  children,
  productKey = "chat",
}: {
  children: React.ReactNode;
  productKey?: ProductKey;
}): React.ReactElement {
  console.log("\n🚨 TOP OF ModelsProvider - START RENDER");
  console.log(`   productKey: ${productKey}`);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<PublicModelItem[]>([]);
  const [selected, setSelected] = useState<SelectedModel | null>({
    id: "pulse-core",
    gen: 1,
  });

  console.log(`✅ States initialized`);
  console.log("🟢 ModelsProvider initialized with productKey:", productKey);

  // ✅ Compute models by product category
  const modelsByProduct = useMemo<Record<ProductKey, PublicModelItem[]>>(
    () => {
      console.log(`📊 [MEMO] Computing modelsByProduct from ${models.length} models`);

      const out: Record<ProductKey, PublicModelItem[]> = {
        core: [],
        chat: [],
        code: [],
        research: [],
        vision: [],
        library: [],
      };

      for (const m of models) {
        const key = mapProductKey(m.product_key);
        if (!key) {
          console.warn(`⚠️ Unknown product_key: ${m.product_key}`);
          continue;
        }
        out[key].push(m);
      }

      // Sort each category by name
      (Object.keys(out) as ProductKey[]).forEach((k) => {
        out[k] = out[k]
          .slice()
          .sort((a, b) => a.public_name.localeCompare(b.public_name));
      });

      console.log(`✅ [MEMO] modelsByProduct computed:`, {
        chat: out.chat.length,
        core: out.core.length,
        code: out.code.length,
        research: out.research.length,
        vision: out.vision.length,
        library: out.library.length,
      });

      return out;
    },
    [models]
  );

  // ✅ Select a specific model
  const selectModel = useCallback(
    (id: string, gen?: number): void => {
      console.log(`🔄 [CALLBACK] selectModel() called:`, { id, gen, productKey });

      const m = models.find((x) => x.id === id);
      if (!m) {
        console.warn(
          `❌ Model ${id} not found in ${models.length} available models`
        );
        return;
      }

      const g = typeof gen === "number" ? gen : m.gen ?? 1;
      const sel: SelectedModel = { id: m.id, gen: clampGen(g) };

      setSelected(sel);
      saveSelection(productKey, sel);

      console.log(`✅ [CALLBACK] Model selected:`, sel);
    },
    [models, productKey]
  );

  // ✅ Set generation (only for non-chat products)
  const setGen = useCallback(
    (gen: number): void => {
      console.log(`🔄 [CALLBACK] setGen() called:`, { gen, productKey });

      if (productKey === "chat") {
        console.log(`ℹ️ Chat product is locked - cannot change generation`);
        return;
      }

      setSelected((prev) => {
        if (!prev) return prev;

        const next: SelectedModel = { ...prev, gen: clampGen(gen) };
        saveSelection(productKey, next);

        console.log(`✅ [CALLBACK] Generation updated:`, next);
        return next;
      });
    },
    [productKey]
  );

  // ✅ Compute display label
  const label = useMemo<string>(() => {
    if (!selected) {
      console.log(`📝 [MEMO] Label: "Select Model" (no selection)`);
      return "Select Model";
    }

    const m = models.find((x) => x.id === selected.id);
    const name =
      m?.public_name ||
      (selected.id === "pulse-core" ? "Core" : selected.id);

    const displayLabel = `${name} G${selected.gen}`;
    console.log(`📝 [MEMO] Label computed:`, displayLabel);

    return displayLabel;
  }, [selected, models]);

  // ✅ Refresh models from API
  const refresh = useCallback(
    async (): Promise<void> => {
      try {
        console.log(`\n🟢 [CALLBACK] refresh() START`);
        console.log(`   productKey: ${productKey}`);

        setLoading(true);
        setError(null);

        // ✅ Fetch models from API
        console.log(`📡 Fetching models for "${productKey}"...`);
        const backendKey = productKey === "chat" ? "pulse" : productKey;
        console.log(`🔄 Backend key mapping: ${productKey} → ${backendKey}`);

        const fetchedModels = await fetchChatModels(backendKey, false);

        console.log(`✅ Fetched ${fetchedModels.length} models from API`);

        if (fetchedModels.length === 0) {
          console.warn(`⚠️ No models returned for "${productKey}"`);
          setModels([]);
          setError(`No models available for ${productKey}`);
          setLoading(false);
          return;
        }

        // ✅ Convert to PublicModelItem (NO FILTERING HERE)
        const mappedData: PublicModelItem[] = fetchedModels.map((m: any) => ({
          object: m.object || "model",
          id: m.id,
          public_name: m.public_name,
          product_key: m.product_key,
          type: m.type,
          gen: Number(m.gen ?? 1),
          status: m.status,
          is_visible: m.is_visible,
          provider: m.provider || "unknown",
          backend_model: m.backend_model || "unknown",
          context_window: m.context_window,
          description: m.description,
          config: m.config,
        }));

        console.log(`✅ Mapped ${mappedData.length} models`);
        console.log(
          `🔥 ALL MODELS:`,
          mappedData.map((m) => `${m.id} (${m.product_key})`).join(", ")
        );

        // ✅ Set models to state (ONLY ONCE)
        setModels(mappedData);
        console.log(`✅ Models set to state (no filtering)`);

        // ✅ Update selection based on ALL models
        setSelected((currentSelected) => {
          console.log(`🔄 Updating selection...`);
          console.log(
            `   - Current: ${currentSelected?.id} (gen ${currentSelected?.gen})`
          );
          console.log(`   - Available: ${mappedData.length} models`);

          // 1. Keep current if still valid
          if (
            currentSelected &&
            mappedData.find((m) => m.id === currentSelected.id)
          ) {
            console.log(`✅ Keeping current selection: ${currentSelected.id}`);
            return currentSelected;
          }

          // 2. Try pulse-core
          const pulseCore = mappedData.find((m) => m.id === "pulse-core");
          if (pulseCore) {
            const sel = { id: pulseCore.id, gen: pulseCore.gen ?? 1 };
            console.log(`✅ Using pulse-core:`, sel);
            saveSelection(productKey, sel);
            return sel;
          }

          // 3. Restore from localStorage
          const saved = loadSavedSelection(productKey);
          if (saved && mappedData.find((m) => m.id === saved.id)) {
            console.log(`✅ Restored from localStorage:`, saved);
            saveSelection(productKey, saved);
            return saved;
          }

          // 4. Use first available
          if (mappedData.length > 0) {
            const first: SelectedModel = {
              id: mappedData[0].id,
              gen: clampGen(mappedData[0].gen ?? 1),
            };
            console.log(`📍 Using first model:`, first);
            saveSelection(productKey, first);
            return first;
          }

          // 5. Keep current
          console.warn(`⚠️ No valid model found, keeping current`);
          return currentSelected;
        });

        console.log(`🎉 [CALLBACK] refresh() SUCCESS\n`);
      } catch (err: any) {
        // ✅ Handle AbortError
        if (err?.name === "AbortError") {
          console.log(`⏹️ Fetch aborted by user`);
          return;
        }

        const errorMsg = err?.message || "Failed to load models";

        // ✅ Ignore 404
        if (errorMsg.includes("404")) {
          console.warn(`⚠️ Models endpoint not found (404)`);
          setError("Models endpoint not available");
          return;
        }

        console.error(`❌ [CALLBACK] Error:`, errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [productKey]
  );

  // ✅ Effect: Fetch models on mount or when refresh changes
  useEffect(() => {
    console.log(`\n🔥 [EFFECT] Running refresh`);
    console.log(`   refresh dependency changed`);

    refresh().catch((err) => {
      console.error(`❌ [EFFECT] refresh() failed:`, err);
    });
  }, [refresh]);

  // ✅ Memoize context value
  const value = useMemo(
    () => {
      console.log(`✅ [MEMO] Creating new context value`);
      return {
        loading,
        error,
        models,
        modelsByProduct,
        selected,
        selectModel,
        setGen,
        refresh,
        label,
      };
    },
    [
      loading,
      error,
      models,
      modelsByProduct,
      selected,
      selectModel,
      setGen,
      refresh,
      label,
    ]
  );

  console.log(`📊 ModelsProvider state:`, {
    loading,
    error,
    modelsCount: models.length,
    selected: selected?.id,
    label,
  });

  console.log("✅ BOTTOM OF ModelsProvider - END RENDER\n");

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ✅ Hook to use models context
export function useModels(): ModelsState {
  console.log(`🎣 useModels() hook - START`);

  const v = useContext(Ctx);

  if (!v) {
    console.error(`❌ useModels() called outside ModelsProvider!`);
    throw new Error("useModels() must be used within <ModelsProvider />");
  }

  console.log(`🎣 useModels() hook - RETURN`, {
    loading: v.loading,
    modelsCount: v.models.length,
    selected: v.selected?.id,
    label: v.label,
  });

  return v;
}