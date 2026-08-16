"use client";

import { useCallback } from "react";

export function useSessionShareActions() {
  const buildSessionUrl = useCallback((sessionId: string | null) => {
    if (typeof window === "undefined" || !sessionId) return null;
    return `${window.location.origin}/qxt-chat?sid=${sessionId}`;
  }, []);

  const copySessionLink = useCallback(
    async (sessionId: string | null) => {
      const url = buildSessionUrl(sessionId);
      if (!url) return;

      await navigator.clipboard?.writeText(url);
    },
    [buildSessionUrl]
  );

  const shareSessionLink = useCallback(
    async (sessionId: string | null) => {
      const url = buildSessionUrl(sessionId);
      if (!url) return;

      if (navigator.share) {
        await navigator.share({ url, title: "ChatQXT" });
      } else {
        await navigator.clipboard?.writeText(url);
      }
    },
    [buildSessionUrl]
  );

  return {
    buildSessionUrl,
    copySessionLink,
    shareSessionLink,
  };
}