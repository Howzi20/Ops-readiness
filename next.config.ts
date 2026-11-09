import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },
  webpack(config, { dev }) {
    if (dev) {
      // The SQLite database lives in prisma/. Saving data changes that file, and without this
      // the dev server treats it as a code change and reloads the page — which can loop.
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/.git/**", "**/node_modules/**", "**/.next/**", "**/prisma/*.db", "**/prisma/*.db-journal", "**/test-results/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
