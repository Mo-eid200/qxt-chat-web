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

import axios from "axios";

import {
  getStoredToken,
  loginSideEffects,
  logoutSideEffects,
  pickTokenFromResponse,
} from "../lib/api/auth/auth.helpers";

import {
  apiLogin,
  apiRegister,
  fetchBootstrap,
  fetchMe,
  fetchMyApiKey,
  invalidateAuthCache,
} from "../lib/api/auth/auth.api";

import type {
  AuthContextValue,
  AuthUser,
  BootstrapResponse,
  LoginResponse,
  RegisterResponse,
} from "../lib/api/auth/auth.types";

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [bootstrap, setBootstrap] =
    useState<BootstrapResponse | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const mountedRef = useRef(true);
  const bootRef = useRef(false);

  // ── Mount lifecycle ────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  const refreshBootstrap =
    useCallback(async (): Promise<BootstrapResponse> => {
      const data = await fetchBootstrap();

      if (mountedRef.current) {
        setBootstrap(data);
        setUser(data.user);
      }

      return data;
    }, []);

  // ── API key ────────────────────────────────────────────────────────────────
  // API key is intentionally outside the critical authentication path.

  const loadApiKeyInBackground = useCallback(async (): Promise<void> => {
    try {
      const key = await fetchMyApiKey();

      if (mountedRef.current) {
        setApiKey(key);
      }
    } catch {
      if (mountedRef.current) {
        setApiKey(null);
      }
    }
  }, []);

  // ── Restore existing session ───────────────────────────────────────────────

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    const token = getStoredToken();

    if (!token) {
      logoutSideEffects();

      if (mountedRef.current) {
        setUser(null);
        setApiKey(null);
        setBootstrap(null);
        setLoadingUser(false);
        setAuthReady(true);
      }

      return;
    }

    loginSideEffects(token);

    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchBootstrap();

        if (cancelled || !mountedRef.current) return;

        setBootstrap(data);
        setUser(data.user);

        // Critical authentication/bootstrap work is complete here.
        setLoadingUser(false);
        setAuthReady(true);

        // API key does not block rendering.
        void loadApiKeyInBackground();
      } catch (error: unknown) {
        if (cancelled || !mountedRef.current) return;

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          logoutSideEffects();
          invalidateAuthCache();
        }

        // For either an invalid session or an unavailable backend,
        // do not expose partially hydrated authenticated state.
        setUser(null);
        setApiKey(null);
        setBootstrap(null);
        setLoadingUser(false);
        setAuthReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadApiKeyInBackground]);

  // ── Token authentication ──────────────────────────────────────────────────

  const setAuthFromToken =
    useCallback(async (
      token: string
    ): Promise<BootstrapResponse> => {
      if (!token) {
        throw new Error("Missing access token");
      }

      loginSideEffects(token);

      if (mountedRef.current) {
        setLoadingUser(true);
        setAuthReady(false);
      }

      try {
        const data = await fetchBootstrap();

        if (mountedRef.current) {
          setBootstrap(data);
          setUser(data.user);
          setLoadingUser(false);
          setAuthReady(true);
        }

        // Non-critical request.
        void loadApiKeyInBackground();

        return data;
      } catch (error: unknown) {
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          logoutSideEffects();
          invalidateAuthCache();

          if (mountedRef.current) {
            setUser(null);
            setApiKey(null);
            setBootstrap(null);
          }
        }

        if (mountedRef.current) {
          setLoadingUser(false);
          setAuthReady(true);
        }

        throw error;
      }
    }, [loadApiKeyInBackground]);

  // ── Login ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    const response = await apiLogin(email, password);

    // MFA challenge is a valid login response.
    // No authenticated session exists until MFA verification succeeds.
    if (response.mfa_required) {
      return response;
    }

    const token = pickTokenFromResponse(response);

    if (!token) {
      throw new Error(
        "Authentication succeeded without an access token"
      );
    }

    await setAuthFromToken(token);

    return response;
  }, [setAuthFromToken]);

  // ── Register ───────────────────────────────────────────────────────────────

  const register = useCallback(async (
    email: string,
    password: string
  ): Promise<RegisterResponse> => {
    const response = await apiRegister(email, password);

    const token = pickTokenFromResponse(response);

    if (!token) {
      throw new Error(
        "Registration succeeded without an access token"
      );
    }

    await setAuthFromToken(token);

    return response;
  }, [setAuthFromToken]);

  // ── Legacy explicit refresh ────────────────────────────────────────────────
  // Kept for existing callers while the rest of the app migrates to bootstrap.

  const refreshMeAndKeys = useCallback(async (): Promise<void> => {
    const me = await fetchMe(true);

    if (!mountedRef.current) return;

    setUser(me);

    const key = await fetchMyApiKey(true);

    if (!mountedRef.current) return;

    setApiKey(key);
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback((): void => {
    logoutSideEffects();
    invalidateAuthCache();

    if (mountedRef.current) {
      setUser(null);
      setApiKey(null);
      setBootstrap(null);
      setLoadingUser(false);
      setAuthReady(true);
    }
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      apiKey,
      bootstrap,
      loadingUser,
      authReady,

      login,
      register,
      logout,

      setAuthFromToken,
      refreshBootstrap,
      refreshMeAndKeys,
    }),
    [
      user,
      apiKey,
      bootstrap,
      loadingUser,
      authReady,
      login,
      register,
      logout,
      setAuthFromToken,
      refreshBootstrap,
      refreshMeAndKeys,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
}