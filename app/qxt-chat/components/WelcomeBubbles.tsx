"use client";

import React from "react";

export function WelcomeBubbles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Large blue orb */}
      <div className="qxt-orb qxt-orb-blue absolute left-[8%] top-[10%] h-[340px] w-[340px]" />

      {/* Violet / magenta orb */}
      <div className="qxt-orb qxt-orb-violet absolute right-[8%] top-[16%] h-[300px] w-[300px]" />

      {/* Cyan orb */}
      <div className="qxt-orb qxt-orb-cyan absolute bottom-[5%] left-[25%] h-[250px] w-[250px]" />

      {/* Green orb */}
      <div className="qxt-orb qxt-orb-green absolute bottom-[8%] right-[18%] h-[210px] w-[210px]" />

      {/* Small warm accent */}
      <div className="qxt-orb qxt-orb-red absolute left-[46%] top-[18%] h-[150px] w-[150px]" />

      {/* Very subtle central glow */}
      <div className="qxt-orb-center absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full" />

      <style jsx>{`
        .qxt-orb {
          border-radius: 9999px;
          opacity: 0.42;
          filter: blur(72px);
          will-change: transform;
          transform: translate3d(0, 0, 0);
        }

        .qxt-orb-blue {
          background:
            radial-gradient(
              circle at 35% 35%,
              rgba(75, 160, 255, 0.9),
              rgba(35, 95, 255, 0.55) 42%,
              transparent 72%
            );
          animation: qxt-float-a 17s ease-in-out infinite alternate;
        }

        .qxt-orb-violet {
          background:
            radial-gradient(
              circle at 45% 40%,
              rgba(210, 75, 255, 0.8),
              rgba(125, 55, 255, 0.5) 45%,
              transparent 73%
            );
          animation: qxt-float-b 21s ease-in-out infinite alternate;
        }

        .qxt-orb-cyan {
          background:
            radial-gradient(
              circle at 40% 40%,
              rgba(55, 220, 255, 0.8),
              rgba(25, 125, 255, 0.4) 46%,
              transparent 72%
            );
          animation: qxt-float-c 19s ease-in-out infinite alternate;
        }

        .qxt-orb-green {
          background:
            radial-gradient(
              circle at 40% 40%,
              rgba(70, 255, 170, 0.7),
              rgba(20, 180, 125, 0.35) 46%,
              transparent 72%
            );
          animation: qxt-float-d 23s ease-in-out infinite alternate;
        }

        .qxt-orb-red {
          background:
            radial-gradient(
              circle at 40% 40%,
              rgba(255, 95, 105, 0.7),
              rgba(255, 55, 100, 0.3) 48%,
              transparent 72%
            );
          animation: qxt-float-e 15s ease-in-out infinite alternate;
        }

        .qxt-orb-center {
          opacity: 0.16;
          filter: blur(100px);
          background:
            radial-gradient(
              circle,
              rgba(120, 120, 255, 0.65),
              transparent 68%
            );
        }

        @keyframes qxt-float-a {
          from {
            transform: translate3d(-20px, -15px, 0) scale(0.94);
          }
          to {
            transform: translate3d(100px, 70px, 0) scale(1.08);
          }
        }

        @keyframes qxt-float-b {
          from {
            transform: translate3d(30px, -25px, 0) scale(1);
          }
          to {
            transform: translate3d(-110px, 90px, 0) scale(1.12);
          }
        }

        @keyframes qxt-float-c {
          from {
            transform: translate3d(-30px, 30px, 0) scale(0.95);
          }
          to {
            transform: translate3d(100px, -75px, 0) scale(1.1);
          }
        }

        @keyframes qxt-float-d {
          from {
            transform: translate3d(35px, 25px, 0) scale(1);
          }
          to {
            transform: translate3d(-90px, -80px, 0) scale(1.12);
          }
        }

        @keyframes qxt-float-e {
          from {
            transform: translate3d(-25px, -20px, 0) scale(0.9);
          }
          to {
            transform: translate3d(75px, 80px, 0) scale(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .qxt-orb {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}