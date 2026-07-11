"use client";

import React, { useEffect, useState } from "react";

interface RotatingHintProps {
  hints: string[];
}

export function RotatingHint({ hints }: RotatingHintProps) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!hints.length) return;

    const sentence = hints[index];
    let i = 0;
    setText("");

    const intervalId = window.setInterval(() => {
      i += 1;
      setText(sentence.slice(0, i));

      if (i >= sentence.length) {
        window.clearInterval(intervalId);
        const timeoutId = window.setTimeout(() => {
          setIndex((prev) => (prev + 1) % hints.length);
        }, 2000); // وقفة بعد ما يكمل السطر
        return () => window.clearTimeout(timeoutId);
      }
    }, 40); // سرعة الكتابة

    return () => {
      window.clearInterval(intervalId);
    };
  }, [index, hints]);

  return <span>{text}</span>;
}
