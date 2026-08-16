"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { ChatMessage } from "../types/chat";

type UseChatScrollBehaviorParams = {
  messages: ChatMessage[];
  streaming: boolean;
};

export function useChatScrollBehavior({
  messages,
  streaming,
}: UseChatScrollBehaviorParams) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const [shouldDockBottom, setShouldDockBottom] = useState(false);

  useEffect(() => {
    const el = bottomRef.current?.closest("main");
    if (!el) return;

    const onScroll = () => {
      shouldAutoScrollRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;

    bottomRef.current?.scrollIntoView({
      behavior: streaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, streaming]);

  useEffect(() => {
    const el = bottomRef.current?.closest("main");
    if (!el) return;

    setShouldDockBottom(el.scrollHeight > el.clientHeight);
  }, [messages, streaming]);

  return {
    bottomRef,
    shouldDockBottom,
  };
}