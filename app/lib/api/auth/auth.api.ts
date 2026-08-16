import { qxtAuthClient } from "../core/qxtClient";
import { mapApiKeyFromList } from "./auth.mapper";

import type {
  AuthUser,
  RawApiKey,
  RawBillingResponse,
  BootstrapResponse,
  LoginResponse,
  RegisterResponse,
} from "./auth.types";

// ─── Cache ────────────────────────────────────────────────────────────────────

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

function makeCache<T>(ttlMs: number) {
  let entry: CacheEntry<T> | null = null;

  return {
    get(): T | null {
      if (!entry) return null;

      if (Date.now() > entry.expiresAt) {
        entry = null;
        return null;
      }

      return entry.value;
    },

    set(value: T): void {
      entry = {
        value,
        expiresAt: Date.now() + ttlMs,
      };
    },

    invalidate(): void {
      entry = null;
    },
  };
}

const meCache = makeCache<AuthUser>(30_000);

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  const res = await qxtAuthClient.get<BootstrapResponse>(
    "/api/v1/bootstrap",
    {
      timeout: 15_000,
    }
  );

  return res.data;
}

// ─── Current User ─────────────────────────────────────────────────────────────

export async function fetchMe(force = false): Promise<AuthUser> {
  if (!force) {
    const cached = meCache.get();

    if (cached) {
      return cached;
    }
  }

  const res = await qxtAuthClient.get<AuthUser | { user: AuthUser }>(
    "/api/v1/auth/me",
    {
      timeout: 12_000,
    }
  );

  const data = res.data;

  const user: AuthUser =
    "user" in data
      ? data.user
      : data;

  meCache.set(user);

  return user;
}

// ─── API Key ──────────────────────────────────────────────────────────────────

export async function fetchMyApiKey(
  _force = false
): Promise<string | null> {
  try {
    const res = await qxtAuthClient.get<
      RawApiKey[] | { items: RawApiKey[] }
    >(
      "/api/v1/api-keys",
      {
        timeout: 10_000,
      }
    );

    const data = res.data;

    const items: RawApiKey[] = Array.isArray(data)
      ? data
      : Array.isArray(data.items)
        ? data.items
        : [];

    return mapApiKeyFromList(items);
  } catch {
    // API key availability must never block authentication/bootstrap.
    return null;
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function apiLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await qxtAuthClient.post<LoginResponse>(
    "/api/v1/auth/login",
    {
      email,
      password,
    }
  );

  return res.data;
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function apiRegister(
  email: string,
  password: string
): Promise<RegisterResponse> {
  const res = await qxtAuthClient.post<RegisterResponse>(
    "/api/v1/auth/register",
    {
      email,
      password,
    }
  );

  return res.data;
}

// ─── Legacy Billing Overview ──────────────────────────────────────────────────
// Kept for compatibility while application startup migrates to /bootstrap.

export async function fetchBillingOverview(): Promise<RawBillingResponse> {
  const res = await qxtAuthClient.get<RawBillingResponse>(
    "/api/v1/company/dashboard/overview",
    {
      timeout: 12_000,
    }
  );

  return res.data;
}

// ─── Cache Invalidation ───────────────────────────────────────────────────────

export function invalidateAuthCache(): void {
  meCache.invalidate();
}