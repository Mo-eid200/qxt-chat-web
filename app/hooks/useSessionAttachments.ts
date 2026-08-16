"use client";

import { useMemo } from "react";
import type { ChatMessage } from "../types/chat";

export interface SessionAttachment {
  id: string;
  type: "image" | "video" | "document" | "other";
  name?: string;
  url?: string;
  preview?: string;
}

/**
 * Derives the Files-panel attachment list straight from the in-memory
 * `messages` array — no backend "list session attachments" endpoint
 * exists yet (see ChatHeader.tsx's FilesPanel TODO), so this is the
 * interim source of truth: every image/document already attached to
 * a message in this session, flattened into one list.
 */
export function useSessionAttachments(messages: ChatMessage[]): SessionAttachment[] {
  return useMemo(() => {
    const items: SessionAttachment[] = [];

    messages.forEach((m, msgIdx) => {
      (m.images ?? []).forEach((url, i) => {
        items.push({
          id: `${msgIdx}-img-${i}`,
          type: "image",
          url,
          preview: url,
          name: `Image ${items.length + 1}`,
        });
      });

      (m.documents ?? []).forEach((doc: any, i: number) => {
        items.push({
          id: `${msgIdx}-doc-${i}`,
          type: "document",
          url: doc?.url,
          name: doc?.name ?? `Document ${items.length + 1}`,
        });
      });
    });

    return items;
  }, [messages]);
}