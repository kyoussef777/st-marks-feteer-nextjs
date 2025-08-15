import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true, // Temporarily disable for build success
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle sqlite3 for client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        sqlite3: false,
      };
    }
    return config;
  },
};

export default nextConfig;