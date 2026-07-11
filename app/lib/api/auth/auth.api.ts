import { qxtAuthClient } from "../core/qxtClient";
import { mapApiKeyFromList } from "./auth.mapper";
import type { AuthUser, RawApiKey } from "./auth.types";

type CacheEntry<T> = { value: T; expiresAt: number };

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
    set(value: T) {
      entry = { value, expiresAt: Date.now() + ttlMs };
    },
    invalidate() {
      entry = null;
    },
  };
}

const meCache = makeCache<AuthUser>(30_000);

export async function fetchMe(force = false): Promise<AuthUser> {
  if (!force) {
    const cached = meCache.get();
    if (cached) return cached;
  }

  const res = await qxtAuthClient.get("/api/v1/auth/me", { timeout: 12000 });
  const user: AuthUser = res.data?.user ?? res.data;
  meCache.set(user);
  return user;
}

export async function fetchMyApiKey(_force = false): Promise<string | null> {
  try {
    const res = await qxtAuthClient.get("/api/v1/api-keys", { timeout: 10000 });

    const arr: RawApiKey[] = Array.isArray(res.data?.items)
      ? res.data.items
      : Array.isArray(res.data)
      ? res.data
      : [];

    return mapApiKeyFromList(arr);
  } catch {
    return null;
  }
}

export async function apiLogin(
  email: string,
  password: string
): Promise<string> {
  const res = await qxtAuthClient.post("/api/v1/auth/login", { email, password });
  return res.data;
}

export async function apiRegister(
  email: string,
  password: string
): Promise<string> {
  const res = await qxtAuthClient.post("/api/v1/auth/register", { email, password });
  return res.data;
}

export async function fetchBillingOverview() {
  const res = await qxtAuthClient.get("/api/v1/company/dashboard/overview", {
    timeout: 12000,
  });
  return res.data;
}

export function invalidateAuthCache() {
  meCache.invalidate();
}