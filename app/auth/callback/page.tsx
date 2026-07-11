"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSideEffects, applyWorkspaceEverywhere, qxtChatClient } from "../../lib/api/core/qxtClient";
import { useAuth } from "../../context/AuthContext";

export default function QxtOAuthCallbackPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { refreshMeAndKeys } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    // =====================================================
    // TOKEN EXTRACTION
    // =====================================================

    const queryToken = sp.get("token") || sp.get("access_token");
    let hashToken: string | null = null;
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash) {
        const parsed = new URLSearchParams(hash.replace("#", ""));
        hashToken = parsed.get("token") || parsed.get("access_token");
      }
    }
    const token = queryToken || hashToken;

    // =====================================================
    // NO TOKEN
    // =====================================================
    if (!token) {
      console.warn("[OAuth] No token found");
      router.replace("/qxt-chat");
      return;
    }

    // =====================================================
    // BOOTSTRAP
    // =====================================================
    const bootstrap = async () => {
      try {
        // STORE JWT
        loginSideEffects(token);
        qxtChatClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        console.log("[OAuth] JWT stored");

        // REFRESH AUTH CONTEXT
        try {
          await refreshMeAndKeys();
          console.log("[OAuth] Auth context refreshed");
        } catch (e) {
          console.warn("[OAuth] refreshMeAndKeys failed", e);
        }

        // LOAD WORKSPACES
        let workspaceId: string | null = null;

        try {
          const wsRes = await qxtChatClient.get("/api/v1/workspaces");
          console.log("[OAuth] Workspaces response:", wsRes.data);

          const raw = wsRes?.data;
          const workspaces = raw?.items || raw?.data || raw || [];
          if (Array.isArray(workspaces) && workspaces.length > 0) {
            const first = workspaces[0];
            if (first?.id) {
              workspaceId = String(first.id);
            }
          }
        } catch (e: any) {
          console.error("[OAuth] Failed loading workspaces:", e?.response?.data || e);
        }

        // ACTIVATE WORKSPACE
        if (workspaceId) {
          try {
            await qxtChatClient.post(`/api/v1/workspaces/${workspaceId}/activate`);
            console.log("[OAuth] Workspace activated on backend");
          } catch (e: any) {
            console.warn("[OAuth] Workspace activate endpoint failed:", e?.response?.data || e);
          }

          // localStorage + axios headers
          applyWorkspaceEverywhere(workspaceId);
          console.log("[OAuth] Workspace applied locally:", workspaceId);
        } else {
          console.warn("[OAuth] No workspace found");
        }

        // SMALL DELAY (prevents race conditions)
        await new Promise((resolve) => setTimeout(resolve, 120));

        // NAVIGATE
        router.replace("/qxt-chat");
      } catch (err: any) {
        console.error("[OAuth] Bootstrap failed:", err?.response?.data || err);
        router.replace("/qxt-chat");
      }
    };

    bootstrap();
  }, [sp, router, refreshMeAndKeys]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020712] text-emerald-50 text-sm">
      Completing sign-in…
    </div>
  );
}