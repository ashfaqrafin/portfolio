import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // allow opening the dev server from other devices on the LAN (phone, other machine)
  allowedDevOrigins: ["192.168.1.2", "192.168.*.*", "*.local"],
  cacheComponents: true,
  partialPrefetching: true,
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
