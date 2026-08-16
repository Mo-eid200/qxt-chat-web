"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchChatModels } from "../lib/api/chat/models";

export type ProductKey = "chat" | "pulse" | "core" | "code" | "research" | "vision" | "library";

export type PublicModelItem = {
  object?: string;
  id: string;
  public_name: string;
  product_key: string;
  type: string;
  gen: number;
  status?: string | null;
  is_visible?: boolean;
  provider?: string;
  backend_model?: string;
  context_window?: number | null;
  description?: string | null;
  config?: Record<string, any>;
  display_group?: string | null;
  display_order?: number;
  generation?: { gen: number; label: string };
};

export type SelectedModel = {
  id: string;
  gen: number;
};

export type ModelGroup = {
  groupKey: string;
  models: PublicModelItem[];
};

// groups models by display_group (e.g. "core"), preserving display_order.
// Models with no display_group are returned ungrouped, at the end.
function groupModelsByDisplayGroup(models: PublicModelItem[]): ModelGroup[] {
  const groups = new Map<string, PublicModelItem[]>();
  const ungrouped: PublicModelItem[] = [];

  for (const model of models) {
    if (!model.display_group) {
      ungrouped.push(model);
      continue;
    }
    if (!groups.has(model.display_group)) {
      groups.set(model.display_group, []);
    }
    groups.get(model.display_group)!.push(model);
  }

  const result: ModelGroup[] = [];
  for (const [groupKey, groupModels] of groups) {
    result.push({
      groupKey,
      models: groupModels.slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    });
  }

  if (ungrouped.length > 0) {
    result.push({ groupKey: "__ungrouped__", models: ungrouped });
  }

  return result;
}

type ModelsByProduct = Record<ProductKey, PublicModelItem[]>;

type ModelsState = {
  loading: boolean;
  error: string | null;
  models: PublicModelItem[];
  modelsByProduct: ModelsByProduct;
  groupedModels: ModelGroup[];   // 🔥 جديد
  selected: SelectedModel | null;
  selectModel: (id: string, gen?: number) => void;
  setGen: (gen: number) => void;
  refresh: (force?: boolean) => Promise<void>;
  label: string;
};

const ModelsContext = createContext<ModelsState | null>(null);
const LS_KEY = "qxt_selected_model_v2";

const EMPTY_MODELS_MAP: ModelsByProduct = {
  chat: [],
  pulse: [],
  core: [],
  code: [],
  research: [],
  vision: [],
  library: [],
};

function mapProductKey(backendKey: string): ProductKey | null {
  if (backendKey === "pulse") {
    return "chat";
  }

  const validKeys: ProductKey[] = ["chat", "pulse", "core", "code", "research", "vision", "library"];

  if (validKeys.includes(backendKey as ProductKey)) {
    return backendKey as ProductKey;
  }

  return null;
}

function clampGen(gen: number): number {
  return Math.max(1, Math.min(999, Number(gen || 1)));
}

function safeParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function loadSelection(productKey: ProductKey): SelectedModel | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(LS_KEY);
  const parsed = safeParse<Partial<Record<ProductKey, SelectedModel>>>(raw);
  const selected = parsed?.[productKey];

  if (!selected?.id) {
    return null;
  }

  return {
    id: String(selected.id),
    gen: clampGen(selected.gen),
  };
}

function saveSelection(productKey: ProductKey, selection: SelectedModel | null): void {
  if (typeof window === "undefined") {
    return;
  }

  const raw = localStorage.getItem(LS_KEY);
  const parsed = safeParse<Partial<Record<ProductKey, SelectedModel>>>(raw) || {};

  if (!selection) {
    delete parsed[productKey];
  } else {
    parsed[productKey] = {
      id: selection.id,
      gen: clampGen(selection.gen),
    };
  }

  localStorage.setItem(LS_KEY, JSON.stringify(parsed));
}

function normalizeModel(raw: any): PublicModelItem {
  return {
    object: raw?.object || "model",
    id: String(raw?.id || ""),
    public_name: String(raw?.public_name || raw?.id || "Unknown"),
    product_key: String(raw?.product_key || "chat"),
    type: String(raw?.type || "chat"),
    gen: clampGen(raw?.gen || 1),
    status: raw?.status || null,
    is_visible: raw?.is_visible !== false,
    provider: raw?.provider || "unknown",
    backend_model: raw?.backend_model || "unknown",
    context_window: raw?.context_window || null,
    description: raw?.description || null,
    config: raw?.config || {},
    display_group: raw?.display_group || null,
    display_order: Number(raw?.display_order || 0),
    generation: raw?.generation || undefined,
  };
}

// Query key is scoped by the *backend* product key (pulse/core/code/...)
// since that's what actually goes over the wire to fetchChatModels.
function backendProductKeyFor(productKey: ProductKey): string {
  return productKey === "chat" ? "pulse" : productKey;
}

function modelsQueryKey(productKey: ProductKey) {
  return ["models", backendProductKeyFor(productKey)] as const;
}

export function ModelsProvider({
  children,
  productKey = "chat",
}: {
  children: React.ReactNode;
  productKey?: ProductKey;
}) {
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<SelectedModel | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSelected(loadSelection(productKey));
    setHydrated(true);
    }, [productKey]);

  // Models rarely change — this used to be a manual fetch +
  // AbortController + setState dance in a `refresh()` callback. React
  // Query now owns fetching/caching/cancellation; a long staleTime
  // reflects how infrequently the model catalog actually changes,
  // while `refresh(true)` below still lets any caller force a fresh
  // fetch on demand (e.g. an admin just added a new model).
  const query = useQuery({
    queryKey: modelsQueryKey(productKey),
    queryFn: async ({ signal }) => {
      const response = await fetchChatModels(backendProductKeyFor(productKey), false, signal);
      return (response || []).map(normalizeModel);
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
});

  const models = useMemo(() => query.data ?? [], [query.data]);

  const groupedModels = useMemo(() => groupModelsByDisplayGroup(models), [models]);
  const modelsByProduct = useMemo<ModelsByProduct>(() => {
    const grouped: ModelsByProduct = { ...EMPTY_MODELS_MAP };

    for (const model of models) {
      const key = mapProductKey(model.product_key);

      if (!key) {
        continue;
      }

      grouped[key].push(model);
    }

    (Object.keys(grouped) as ProductKey[]).forEach((key) => {
      grouped[key] = grouped[key]
        .slice()
        .sort((a, b) => (b.gen ?? 0) - (a.gen ?? 0) || a.public_name.localeCompare(b.public_name));
    });

    return grouped;
  }, [models]);

  // Reconciles the currently-selected model against whatever list just
  // came back (kept as its own effect since React Query v5 dropped
  // per-query onSuccess callbacks). Same logic as before: keep the
  // current selection if still valid, else fall back to whatever's in
  // localStorage, else the first available model.
  useEffect(() => {
    if (!models.length) return;

    setSelected((current) => {
      if (current && models.find((model) => model.id === current.id)) {
        return current;
      }

      const stored = loadSelection(productKey);

      if (stored && models.find((model) => model.id === stored.id)) {
        saveSelection(productKey, stored);
        return stored;
      }

      const first = models[0];

      if (first) {
        const next: SelectedModel = {
          id: first.id,
          gen: first.gen,
        };
        saveSelection(productKey, next);
        return next;
      }

      return current;
    });
  }, [models, productKey]);

  const selectModel = useCallback(
    (id: string, gen?: number): void => {
      const found = models.find((model: PublicModelItem) => model.id === id);

      if (!found) {
        return;
      }

      const next: SelectedModel = {
        id: found.id,
        gen: clampGen(gen ?? found.gen ?? 1),
      };

      setSelected(next);
      saveSelection(productKey, next);
    },
    [models, productKey]
  );

  const setGen = useCallback(
    (gen: number): void => {
      setSelected((prev) => {
        if (!prev) {
          return prev;
        }

        const next = { ...prev, gen: clampGen(gen) };
        saveSelection(productKey, next);
        return next;
      });
    },
    [productKey]
  );

  const label = useMemo(() => {
    if (!hydrated || !selected) {
      return "Select Model";
    }

    const found = models.find((model: PublicModelItem) => model.id === selected.id);
    const name = found?.public_name || selected.id;
    const genLabel = found?.generation?.label || `G${selected.gen}`;

    return `${name} ${genLabel}`;
}, [hydrated, selected, models]);

  // Same external contract as before: `refresh()` re-fetches,
  // `refresh(true)` forces a fresh fetch bypassing the cached/stale
  // data (used to be done with a manual AbortController; now it's an
  // explicit invalidate + refetch on the React Query cache).
  const refresh = useCallback(
    async (force = false): Promise<void> => {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: modelsQueryKey(productKey) });
      }
      await query.refetch();
    },
    [queryClient, productKey, query.refetch]
);

  const errorMessage = useMemo(() => {
    if (!query.error) return null;
    return (query.error as Error)?.message || "Failed to load models";
  }, [query.error]);

  const value = useMemo<ModelsState>(
    () => ({
      loading: query.isLoading,
      error: errorMessage,
      models,
      modelsByProduct,
      groupedModels,
      selected,
      selectModel,
      setGen,
      refresh,
      label,
    }),
    [query.isLoading, errorMessage, models, modelsByProduct, selected, selectModel, setGen, refresh, label]
  );

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
}

export function useModels(): ModelsState {
  const context = useContext(ModelsContext);

  if (!context) {
    throw new Error("useModels must be used within ModelsProvider");
  }

  return context;
}