"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, Reaction } from "../types/chat";

export function useChatMessageActions(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [reactions, setReactions] = useState<Record<number, Reaction>>({});
  const [expandedMsgs, setExpandedMsgs] = useState<Record<number, boolean>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleCopy = useCallback((text: string, idx: number) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedIndex(idx);
      window.setTimeout(() => setCopiedIndex(null), 1200);
    });
  }, []);

  const handleReaction = useCallback((idx: number, r: Reaction) => {
    setReactions((prev) => ({ ...prev, [idx]: prev[idx] === r ? null : r }));
  }, []);

  const handleShare = useCallback(async (text: string) => {
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard?.writeText(text);
    } catch {}
  }, []);

  const handleReport = useCallback((text: string) => {
    alert("Report submitted:\n\n" + text);
  }, []);

  const startEdit = useCallback((idx: number, original: string) => {
    setEditingIndex(idx);
    setEditingText(original);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingText("");
  }, []);

  const saveEdit = useCallback(() => {
    if (editingIndex == null) return;
    const value = editingText.trim();
    if (!value) return;

    setMessages((prev) =>
      prev.map((m, i) => (i === editingIndex ? { ...m, content: value } : m))
    );

    setEditingIndex(null);
    setEditingText("");
  }, [editingIndex, editingText, setMessages]);

  const isLongText = useCallback((s: unknown) => {
    const text = typeof s === "string" ? s : String(s ?? "");
    return text.length > 900 || text.split("\n").length > 14;
  }, []);

  const clampText = useCallback((s: unknown) => {
    const text = typeof s === "string" ? s : String(s ?? "");
    const lines = text.split("\n");
    if (lines.length > 14) return lines.slice(0, 14).join("\n") + "\n...";
    if (text.length > 900) return text.slice(0, 900) + "...";
    return text;
  }, []);

  return {
    copiedIndex,
    reactions,
    expandedMsgs,
    setExpandedMsgs,
    editingIndex,
    editingText,
    setEditingText,
    handleCopy,
    handleReaction,
    handleShare,
    handleReport,
    startEdit,
    cancelEdit,
    saveEdit,
    isLongText,
    clampText,
  };
}