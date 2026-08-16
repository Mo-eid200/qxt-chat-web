"use client";

import Lottie from "lottie-react";
import animationData from "@/public/lottie/openqcore-loader.json";

export default function Test() {
  return (
    <div
      style={{
        width: 250,
        height: 250,
        background: "#222",
      }}
    >
      <Lottie
        animationData={animationData}
        rendererSettings={{
          progressiveLoad: false,
          preserveAspectRatio: "xMidYMid meet",
        }}
      />
    </div>
  );
}