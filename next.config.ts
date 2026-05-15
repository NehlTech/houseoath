import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // pdfjs-dist tries to require 'canvas' on the server side; alias it away
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: {
        // pdfjs-dist tries to require 'canvas' server-side; point to empty module
        canvas: './canvas-empty.js',
      },
    },
  },
};

export default nextConfig;
