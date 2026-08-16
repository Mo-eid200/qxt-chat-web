"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

type MinimapMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content?: string;
};

type Props = {
  messages: MinimapMessage[];
  containerRef: React.RefObject<HTMLElement | null>;
};

const MIN_MESSAGES_TO_SHOW = 10;
const GROUP_THRESHOLD = 50; // group consecutive same-role messages when total > this

function truncateAtWord(text: string, maxLen: number): string {
  const clean = (text || "").trim();
  if (clean.length <= maxLen) return clean || "…";
  const cut = clean.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + "…";
}

type MinimapEntry = {
  ids: string[];
  role: "user" | "assistant";
  label: string;
  weight: number; // relative bar length, 1-3
};

export function ChatMinimap({ messages, containerRef }: Props) {
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const validMessages = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m, idx) => ({ ...m, id: m.id || `fallback-${idx}` })),
    [messages]
);

  useEffect(() => {
    setVisible(validMessages.length >= MIN_MESSAGES_TO_SHOW);
  }, [validMessages.length]);

  // Build entries: grouped if the conversation is long, one-per-message otherwise
  const entries = useMemo<MinimapEntry[]>(() => {
    if (validMessages.length === 0) return [];

    const shouldGroup = validMessages.length > GROUP_THRESHOLD;
    const result: MinimapEntry[] = [];

    let i = 0;
    while (i < validMessages.length) {
      const msg = validMessages[i];
      const role = msg.role as "user" | "assistant";

      if (!shouldGroup) {
        const len = (msg.content || "").length;
        const weight = len > 400 ? 3 : len > 120 ? 2 : 1;
        result.push({
          ids: [msg.id],
          role,
          label: truncateAtWord(msg.content || "", 60),
          weight,
        });
        i += 1;
        continue;
      }

      // grouped mode: bundle up to 5 consecutive same-role messages
      const group: typeof validMessages = [msg];
      let j = i + 1;
      while (j < validMessages.length && validMessages[j].role === role && group.length < 5) {
        group.push(validMessages[j]);
        j += 1;
      }

      result.push({
        ids: group.map((m) => m.id),
        role,
        label:
          group.length === 1
            ? truncateAtWord(msg.content || "", 60)
            : `${group.length} messages — ${truncateAtWord(msg.content || "", 40)}`,
        weight: 2,
      });
      i = j;
    }

    return result;
  }, [validMessages]);

  // Track which message is currently in view (for the "you are here" highlight)
  useEffect(() => {
    if (!visible) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (observedEntries) => {
        const visibleOnes = observedEntries.filter((e) => e.isIntersecting);
        if (visibleOnes.length === 0) return;

        // pick the one closest to the vertical center of the container
        const containerRect = container.getBoundingClientRect();
        const containerMid = containerRect.top + containerRect.height / 2;

        let closest: Element | null = null;
        let closestDist = Infinity;
        for (const e of visibleOnes) {
          const rect = e.target.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          const dist = Math.abs(mid - containerMid);
          if (dist < closestDist) {
            closestDist = dist;
            closest = e.target;
          }
        }

        if (closest) {
          const id = closest.getAttribute("id");
          if (id) setActiveId(id.replace(/^msg-/, ""));
        }

        // show "jump to latest" if the last message isn't visible
        const lastMsg = validMessages[validMessages.length - 1];
        const lastVisible = observedEntries.find(
          (e) => e.target.getAttribute("id") === `msg-${lastMsg?.id}`
        );
        setShowJumpToLatest(lastMsg ? !(lastVisible?.isIntersecting ?? false) : false);
      },
      { root: container, threshold: 0.3 }
    );

    validMessages.forEach((m) => {
      const el = document.getElementById(`msg-${m.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [visible, validMessages, containerRef]);

  const handleNavigate = (ids: string[]) => {
    const targetId = ids[0];
    const el = document.getElementById(`msg-${targetId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleJumpToLatest = () => {
    const last = validMessages[validMessages.length - 1];
    if (!last) return;
    const el = document.getElementById(`msg-${last.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  if (!visible || entries.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-2 animate-in fade-in duration-500"
    >
      {showJumpToLatest && (
        <button
          onClick={handleJumpToLatest}
          title="Jump to latest"
          className="mb-1 h-7 w-7 rounded-full flex items-center justify-center bg-black/60 border border-white/10 text-zinc-300 hover:text-blue-300 hover:border-blue-400/40 transition-colors shadow-lg"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex flex-col items-end gap-[3px] py-2 px-1.5 rounded-full bg-black/30 backdrop-blur-sm">
        {entries.map((entry, idx) => {
          const isActive = entry.ids.includes(activeId || "");
          const isHovered = hoveredIdx === idx;
          const barWidth = 12 + entry.weight * 4; // 16 / 20 / 24 px
          const colorClass =
            entry.role === "user"
              ? isActive
                ? "bg-emerald-400"
                : "bg-emerald-600/50 group-hover:bg-emerald-500/80"
              : isActive
              ? "bg-blue-400"
              : "bg-blue-600/50 group-hover:bg-blue-500/80";

          return (
            <div
              key={entry.ids[0]}
              className="group relative flex items-center justify-end"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {isHovered && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/10 text-[11px] text-zinc-200 shadow-xl pointer-events-none">
                  {entry.label}
                </div>
              )}
              <button
                onClick={() => handleNavigate(entry.ids)}
                className={`h-1 rounded-full transition-all duration-150 ${colorClass} ${
                  isActive ? "h-1.5 shadow-md" : ""
                }`}
                style={{ width: isHovered ? barWidth + 8 : barWidth }}
                aria-label={entry.label}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

ChatMinimap.displayName = "ChatMinimap";