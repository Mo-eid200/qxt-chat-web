"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  qxtAuthClient,
  qxtApiClient,
  setApiKeyHeader,
  loginSideEffects,
  logoutSideEffects,
  getStoredToken,
} from "../lib/api/core/qxtClient";
/* =======================
   Types
======================= */

export type AuthUser = {
  id?: number | string;
  email: string;
  full_name?: string | null;
  company_id?: number | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loadingUser: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;

  // ✅ OAuth / callback support
  setAuthFromToken: (token: string) => Promise<void>;

  // ✅ used by callback page (me + api keys)
  refreshMeAndKeys: () => Promise<void>;

  // optional: expose current api key if you want
  apiKey: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/* =======================
   Helpers
======================= */

async function fetchMe(): Promise<AuthUser> {
  const res = await qxtAuthClient.get("/api/v1/auth/me");
  // backend might return {user: ...} or user directly
  return res.data?.user ?? res.data;
}

// حاول تجيب API Key للشركة (لو endpoint موجود)
// لو مش موجود، هيفشل silently ومش هيكسر أي حاجة
async function fetchMyApiKey(): Promise<string | null> {
  try {
    // ✅ غيّر ده لو endpoint عندك مختلف
    // شائع: /api/v1/api-keys or /api/v1/api-keys/me
    const res = await qxtApiClient.get("/api/v1/api-keys");
    const arr = Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
    const first = arr.find((k: any) => k?.key || k?.value || k?.api_key_value) ?? null;
    const key = first?.key || first?.value || first?.api_key_value || null;
    return key ? String(key) : null;
  } catch {
    return null;
  }
}

function pickTokenFromResponse(data: any): string {
  return (
    data?.access_token ||
    data?.token ||
    data?.jwt ||
    data?.data?.access_token ||
    ""
  );
}

/* =======================
   Provider
======================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ✅ Load session on boot (production stable)
  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      // ensure clean state
      logoutSideEffects();
      setApiKey(null);
      setUser(null);
      setLoadingUser(false);
      return;
    }

    // attach JWT everywhere
    loginSideEffects(token);

    (async () => {
      try {
        const me = await fetchMe();
        setUser(me);

        const k = await fetchMyApiKey();
        setApiKey(k);
        setApiKeyHeader(k);
      } catch {
        // token invalid / expired
        logoutSideEffects();
        setApiKey(null);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  // ✅ One function that refreshes everything (used by OAuth callback too)
  async function refreshMeAndKeys() {
    const me = await fetchMe();
    setUser(me);

    const k = await fetchMyApiKey();
    setApiKey(k);
    setApiKeyHeader(k);
  }

  // ✅ OAuth callback: token comes from URL
  async function setAuthFromToken(token: string) {
    if (!token) throw new Error("Missing token");

    // store + attach Authorization everywhere
    loginSideEffects(token);

    // now load user + api keys
    await refreshMeAndKeys();
  }

  async function login(email: string, password: string) {
    const res = await qxtAuthClient.post("/api/v1/auth/login", { email, password });
    const token = pickTokenFromResponse(res.data);

    if (!token) throw new Error("No access token returned from backend");

    await setAuthFromToken(token);
  }

  async function register(email: string, password: string) {
    const res = await qxtAuthClient.post("/api/v1/auth/register", { email, password });
    const token = pickTokenFromResponse(res.data);

    // لو register بيرجع user بس → اعمل login
    if (!token) {
      await login(email, password);
      return;
    }

    await setAuthFromToken(token);
  }

  function logout() {
    logoutSideEffects();
    setApiKey(null);
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      apiKey,
      loadingUser,
      login,
      register,
      logout,
      setAuthFromToken,
      refreshMeAndKeys,
    }),
    [user, apiKey, loadingUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* =======================
   Hook
======================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}   