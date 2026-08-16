"use client";

import { useCallback } from "react";

import type {
  ChatMessage,
  VoiceMessagePayload,
} from "../types/chat";

type UseVoiceMessageSyncParams = {
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  messagesRef: React.MutableRefObject<ChatMessage[]>;
};

export function useVoiceMessageSync({
  setMessages,
  messagesRef,
}: UseVoiceMessageSyncParams) {
  const handleVoiceMessage = useCallback(
    (data: VoiceMessagePayload) => {
      const id = (data as any).id as string | undefined;
      const kind = (data as any).kind as string | undefined;
      const text = (data as any).text as string | undefined;
      const audioUrl = (data as any).audioUrl as string | undefined;

      if (!id) return;

      if (text === "__VOICE_CANCEL__") {
        const base = id.startsWith("assistant-")
          ? id.replace(/^assistant-/, "")
          : id;

        setMessages((prev) => {
          const filtered = prev.filter((m: any) => {
            const mid = (m as any).id;
            const role = (m as any).role;
            const kind2 = (m as any).kind;
            const content = String((m as any).content ?? "");

            if (mid === base || mid === `assistant-${base}`) return false;

            if (
              role === "system" &&
              (kind2 === "stream_update" || kind2 === "text") &&
              content.trim() === ""
            ) {
              return false;
            }

            if (
              role === "system" &&
              (content.includes("Processing voice") ||
                content.includes("جاري معالجة الصوت"))
            ) {
              return false;
            }

            return true;
          });

          messagesRef.current = filtered;
          return filtered;
        });

        return;
      }

      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m: any) => (m as any).id === id);
        const prevMsg = idx !== -1 ? (updated[idx] as any) : null;

        const next: ChatMessage = {
          ...(prevMsg || {}),
          id,
          role: data.role,
          kind: (kind as any) || (prevMsg?.kind ?? "text"),
          content:
            typeof text === "string" ? text : prevMsg?.content ?? "",
          ...(audioUrl ? { audioUrl } : {}),
        } as any;

        if (idx === -1) updated.push(next);
        else updated[idx] = next;

        messagesRef.current = updated;
        return updated;
      });
    },
    [setMessages, messagesRef]
  );

  return {
    handleVoiceMessage,
  };
}