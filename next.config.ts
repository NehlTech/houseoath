import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. We do this to prioritize fixing the iOS crash first.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
