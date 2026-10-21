import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // allow opening the dev server from other devices on the LAN (phone, other machine)
  allowedDevOrigins: ["192.168.1.2", "192.168.*.*", "*.local"],
  // no Next.js badge on the page in development
  devIndicators: false,
  // don't write an AGENTS.md (instructions for AI coding tools) into the project
  agentRules: false,
  cacheComponents: true,
  // project pages and logos are read from content/ at run time; on Vercel a
  // function only has the files traced into it, so name them here
  outputFileTracingIncludes: {
    "/": ["./content/projects/**/*"],
    "/api/projects/[slug]/art": ["./content/projects/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
