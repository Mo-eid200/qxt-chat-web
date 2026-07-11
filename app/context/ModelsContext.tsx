"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchChatModels,
} from "../lib/api/chat/models";

export type ProductKey =
  | "chat"
  | "pulse"
  | "core"
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
  status?: string | null;
  is_visible?: boolean;
  provider?: string;
  backend_model?: string;
  context_window?: number | null;
  description?: string | null;
  config?: Record<
    string,
    any
  >;
};

export type SelectedModel = {
  id: string;
  gen: number;
};

type ModelsByProduct =
  Record<
    ProductKey,
    PublicModelItem[]
  >;

type ModelsState = {
  loading: boolean;
  error: string | null;
  models: PublicModelItem[];
  modelsByProduct:
    ModelsByProduct;
  selected:
    | SelectedModel
    | null;
  selectModel: (
    id: string,
    gen?: number
  ) => void;
  setGen: (
    gen: number
  ) => void;
  refresh: (
    force?: boolean
  ) => Promise<void>;
  label: string;
};

const ModelsContext =
  createContext<
    ModelsState | null
  >(null);

const LS_KEY =
  "qxt_selected_model_v2";

const EMPTY_MODELS_MAP:
  ModelsByProduct = {
    chat: [],
    pulse: [],
    core: [],
    code: [],
    research: [],
    vision: [],
    library: [],
  };

function mapProductKey(
  backendKey: string
): ProductKey | null {
  if (
    backendKey === "pulse"
  ) {
    return "chat";
  }

  const validKeys:
    ProductKey[] = [
    "chat",
    "pulse",
    "core",
    "code",
    "research",
    "vision",
    "library",
  ];

  if (
    validKeys.includes(
      backendKey as ProductKey
    )
  ) {
    return backendKey as ProductKey;
  }

  return null;
}

function clampGen(
  gen: number
): number {
  return Math.max(
    1,
    Math.min(
      999,
      Number(gen || 1)
    )
  );
}

function safeParse<T>(
  value: string | null
): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(
      value
    ) as T;
  } catch {
    return null;
  }
}

function loadSelection(
  productKey: ProductKey
):
  | SelectedModel
  | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const raw =
    localStorage.getItem(
      LS_KEY
    );

  const parsed =
    safeParse<
      Partial<
        Record<
          ProductKey,
          SelectedModel
        >
      >
    >(raw);

  const selected =
    parsed?.[
      productKey
    ];

  if (
    !selected?.id
  ) {
    return null;
  }

  return {
    id: String(
      selected.id
    ),
    gen: clampGen(
      selected.gen
    ),
  };
}

function saveSelection(
  productKey: ProductKey,
  selection:
    | SelectedModel
    | null
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const raw =
    localStorage.getItem(
      LS_KEY
    );

  const parsed =
    safeParse<
      Partial<
        Record<
          ProductKey,
          SelectedModel
        >
      >
    >(raw) || {};

  if (!selection) {
    delete parsed[
      productKey
    ];
  } else {
    parsed[
      productKey
    ] = {
      id: selection.id,
      gen: clampGen(
        selection.gen
      ),
    };
  }

  localStorage.setItem(
    LS_KEY,
    JSON.stringify(
      parsed
    )
  );
}

function normalizeModel(
  raw: any
): PublicModelItem {
  return {
    object:
      raw?.object ||
      "model",
    id: String(
      raw?.id || ""
    ),
    public_name:
      String(
        raw?.public_name ||
        raw?.id ||
        "Unknown"
      ),
    product_key:
      String(
        raw?.product_key ||
        "chat"
      ),
    type: String(
      raw?.type ||
      "chat"
    ),
    gen: clampGen(
      raw?.gen || 1
    ),
    status:
      raw?.status ||
      null,
    is_visible:
      raw?.is_visible !==
      false,
    provider:
      raw?.provider ||
      "unknown",
    backend_model:
      raw?.backend_model ||
      "unknown",
    context_window:
      raw?.context_window ||
      null,
    description:
      raw?.description ||
      null,
    config:
      raw?.config ||
      {},
  };
}

export function ModelsProvider({
  children,
  productKey = "chat",
}: {
  children: React.ReactNode;
  productKey?: ProductKey;
}) {
  const mountedRef =
    useRef(true);

  const abortRef =
    useRef<
      AbortController | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    models,
    setModels,
  ] = useState<
    PublicModelItem[]
  >([]);

  const [
    selected,
    setSelected,
  ] = useState<
    SelectedModel | null
  >(
    loadSelection(
      productKey
    )
  );

  const modelsByProduct =
    useMemo<
      ModelsByProduct
    >(() => {
      const grouped:
        ModelsByProduct =
          {
            ...EMPTY_MODELS_MAP,
          };

      for (const model of models) {
        const key =
          mapProductKey(
            model.product_key
          );

        if (!key) {
          continue;
        }

        grouped[key].push(
          model
        );
      }

      (
        Object.keys(
          grouped
        ) as ProductKey[]
      ).forEach((key) => {
        grouped[key] =
          grouped[
            key
          ]
            .slice()
            .sort(
              (a, b) =>
                (
                  b.gen ?? 0
                ) -
                  (
                    a.gen ?? 0
                  ) ||
                a.public_name.localeCompare(
                  b.public_name
                )
            );
      });

      return grouped;
    }, [models]);

  const selectModel =
    useCallback(
      (
        id: string,
        gen?: number
      ): void => {
        const found =
          models.find(
            (
              model: PublicModelItem
            ) =>
              model.id ===
              id
          );

        if (!found) {
          return;
        }

        const next:
          SelectedModel = {
            id: found.id,
            gen: clampGen(
              gen ??
                found.gen ??
                1
            ),
          };

        setSelected(
          next
        );

        saveSelection(
          productKey,
          next
        );
      },
      [
        models,
        productKey,
      ]
    );

  const setGen =
    useCallback(
      (
        gen: number
      ): void => {
        setSelected(
          (
            prev
          ) => {
            if (!prev) {
              return prev;
            }

            const next =
              {
                ...prev,
                gen:
                  clampGen(
                    gen
                  ),
              };

            saveSelection(
              productKey,
              next
            );

            return next;
          }
        );
      },
      [productKey]
    );

  const label =
    useMemo(() => {
      if (
        !selected
      ) {
        return "Select Model";
      }

      const found =
        models.find(
          (
            model: PublicModelItem
          ) =>
            model.id ===
            selected.id
        );

      const name =
        found
          ?.public_name ||
        selected.id;

      return `${name} G${selected.gen}`;
    }, [
      selected,
      models,
    ]);

  const refresh =
    useCallback(
      async (
        force = false
      ): Promise<void> => {
        try {
          if (
            abortRef.current
          ) {
            abortRef.current.abort();
          }

          const controller =
            new AbortController();

          abortRef.current =
            controller;

          setLoading(
            true
          );
          setError(null);

          const backendKey =
            productKey ===
            "chat"
              ? "pulse"
              : productKey;

          const response =
            await fetchChatModels(
              backendKey,
              force,
              controller.signal
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          const normalized =
            (
              response || []
            ).map(
              normalizeModel
            );

          setModels(
            normalized
          );

          setSelected(
            (
              current
            ) => {
              if (
                current &&
                normalized.find(
                  (
                    model: PublicModelItem
                  ) =>
                    model.id ===
                    current.id
                )
              ) {
                return current;
              }

              const stored =
                loadSelection(
                  productKey
                );

              if (
                stored &&
                normalized.find(
                  (
                    model: PublicModelItem
                  ) =>
                    model.id ===
                    stored.id
                )
              ) {
                saveSelection(
                  productKey,
                  stored
                );

                return stored;
              }

              const first =
                normalized[0];

              if (
                first
              ) {
                const next:
                  SelectedModel =
                    {
                      id: first.id,
                      gen: first.gen,
                    };

                saveSelection(
                  productKey,
                  next
                );

                return next;
              }

              return current ?? null;
            }
          );
        } catch (
          error: any
        ) {
          if (
            error?.name ===
              "CanceledError" ||
            error?.name ===
              "AbortError"
          ) {
            return;
          }

          if (process.env.NODE_ENV === "development") {
  console.warn(
    "[Models] Failed:",
    error?.message || error
  );
}

          setError(
            error?.message ||
              "Failed to load models"
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setLoading(
              false
            );
          }
        }
      },
      [productKey]
    );

  useEffect(() => {
    mountedRef.current =
      true;

    refresh().catch(
      console.error
    );

    return () => {
      mountedRef.current =
        false;
      abortRef.current?.abort();
    };
  }, [refresh]);

  const value =
    useMemo<
      ModelsState
    >(
      () => ({
        loading,
        error,
        models,
        modelsByProduct,
        selected,
        selectModel,
        setGen,
        refresh,
        label,
      }),
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

  return (
    <ModelsContext.Provider
      value={value}
    >
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels():
ModelsState {
  const context =
    useContext(
      ModelsContext
    );

  if (!context) {
    throw new Error(
      "useModels must be used within ModelsProvider"
    );
  }

  return context;
}