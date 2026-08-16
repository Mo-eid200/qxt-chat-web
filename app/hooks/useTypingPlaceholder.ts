"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UseTypingPlaceholderParams = {
  conversationStarted: boolean;
};

export function useTypingPlaceholder({
  conversationStarted,
}: UseTypingPlaceholderParams) {
  const [typedPlaceholder, setTypedPlaceholder] = useState("");

  const phraseIndexRef = useRef(0);

  const rotatingHints = useMemo(
    () => [
      "Improve your CV or LinkedIn profile.",
      "Ask for an online business plan.",
      "Validate a startup idea step by step.",
      "Craft a powerful email or outreach message.",
      "Design a marketing plan for your project.",
    ],
    []
  );

  const placeholderPhrases = useMemo(
    () => [
      "Start your first conversation with Quarc...",
      ...rotatingHints,
      "Type any question or idea you have in mind...",
    ],
    [rotatingHints]
  );

  const activePlaceholder =
    "Type your message here, then press Enter to send...";

  useEffect(() => {
    if (conversationStarted) {
      setTypedPlaceholder(activePlaceholder);
      return;
    }

    const phrase = placeholderPhrases[phraseIndexRef.current];
    let charIndex = 0;
    setTypedPlaceholder("");

    const typing = window.setInterval(() => {
      setTypedPlaceholder(phrase.slice(0, charIndex + 1));
      charIndex++;

      if (charIndex >= phrase.length) {
        window.clearInterval(typing);

        window.setTimeout(() => {
          phraseIndexRef.current =
            (phraseIndexRef.current + 1) % placeholderPhrases.length;
          setTypedPlaceholder("");
        }, 2200);
      }
    }, 32);

    return () => window.clearInterval(typing);
  }, [conversationStarted, activePlaceholder, placeholderPhrases]);

  return {
    typedPlaceholder,
  };
}