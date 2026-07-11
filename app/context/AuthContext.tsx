"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";

import {
  getStoredToken,
  loginSideEffects,
  logoutSideEffects,
  pickTokenFromResponse,
} from "../lib/api/auth/auth.helpers";

import {
  fetchMe,
  fetchMyApiKey,
  apiLogin,
  apiRegister,
  invalidateAuthCache,
} from "../lib/api/auth/auth.api";

import type { AuthUser, AuthContextValue } from "../lib/api/auth/auth.types";

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const mountedRef = useRef(true);
  const bootRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Boot: restore session from stored token ──────────────────────────────
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    const token = getStoredToken();

    if (!token) {
      logoutSideEffects();
      if (mountedRef.current) {
        setUser(null);
        setApiKey(null);
        setLoadingUser(false);
      }
      return;
    }

    loginSideEffects(token);

    let cancelled = false;

    (async () => {
      try {
        // fetchMe uses cache — safe to call freely
        const me = await fetchMe();
        if (cancelled || !mountedRef.current) return;
        setUser(me);
        setLoadingUser(false);

        const k = await fetchMyApiKey();
        if (cancelled || !mountedRef.current) return;
        setApiKey(k);
      } catch (error: any) {
        if (cancelled || !mountedRef.current) return;

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          logoutSideEffects();
          invalidateAuthCache();
          setUser(null);
          setApiKey(null);
        } else {
          // Network / transient error — don't kill the session
          setUser(null);
          setApiKey(null);
        }

        setLoadingUser(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Shared helpers ────────────────────────────────────────────────────────

  async function refreshMeAndKeys() {
    // force=true bypasses cache (explicit refresh)
    const me = await fetchMe(true);
    if (!mountedRef.current) return;
    setUser(me);

    const k = await fetchMyApiKey(true);
    if (!mountedRef.current) return;
    setApiKey(k);
  }

  async function setAuthFromToken(token: string) {
    if (!token) throw new Error("Missing token");

    await loginSideEffects(token);
    if (mountedRef.current) setLoadingUser(true);

    try {
      await refreshMeAndKeys();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await logoutSideEffects();
        invalidateAuthCache();
        if (mountedRef.current) {
          setUser(null);
          setApiKey(null);
        }
      }
      throw error;
    } finally {
      if (mountedRef.current) setLoadingUser(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiLogin(email, password);
    const token = pickTokenFromResponse(data);
    if (!token) throw new Error("No access token returned from backend");
    await setAuthFromToken(token);
  }

  async function register(email: string, password: string) {
    const data = await apiRegister(email, password);
    const token = pickTokenFromResponse(data);

    if (!token) {
      // Some backends don't return token on register — fall back to login
      await login(email, password);
      return;
    }

    await setAuthFromToken(token);
  }

  function logout() {
    logoutSideEffects();
    invalidateAuthCache();
    if (mountedRef.current) {
      setUser(null);
      setApiKey(null);
      setLoadingUser(false);
    }
  }

  // ── Value ─────────────────────────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
