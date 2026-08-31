import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-f2a8008bebe04624805d65d717735116.r2.dev",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/",
        destination: "/qxt-chat",
      },
    ];
  },
};

export default nextConfig;