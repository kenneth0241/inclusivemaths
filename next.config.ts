import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      { source: "/manage", destination: "/knowledge/textbook", permanent: false },
      { source: "/knowledge/edb", destination: "/knowledge/textbook", permanent: false },
    ];
  },
  experimental: {
    agentUpgrade: "security",
    proxyClientMaxBodySize: "50mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
