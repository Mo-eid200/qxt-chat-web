import {
  qxtAuthClient,
  qxtApiClient,
  qxtChatClient,
} from "../../api/core/qxtClient";

const TOKEN_KEY = "qxt_access_token"; // ✅ نفس الـ key في qxtClient

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Side effects ─────────────────────────────────────────────────────────────

/**
 * Synchronous - يحط التوكن في storage والـ axios headers فوراً
 * قبل أي API call تاني
 */
export function loginSideEffects(token: string): void {
  setStoredToken(token);
  qxtAuthClient.defaults.headers.common["Authorization"]  = `Bearer ${token}`;
  qxtApiClient.defaults.headers.common["Authorization"]   = `Bearer ${token}`;
  qxtChatClient.defaults.headers.common["Authorization"]  = `Bearer ${token}`;
}

/**
 * Synchronous - يمسح التوكن من storage والـ axios headers فوراً
 */
export function logoutSideEffects(): void {
  removeStoredToken();
  delete qxtAuthClient.defaults.headers.common["Authorization"];
  delete qxtApiClient.defaults.headers.common["Authorization"];
  delete qxtChatClient.defaults.headers.common["Authorization"];
}

// ─── Token picker ─────────────────────────────────────────────────────────────

export function pickTokenFromResponse(data: any): string {
  return (
    data?.access_token      ||
    data?.token             ||
    data?.jwt               ||
    data?.data?.access_token ||
    ""
  );
}