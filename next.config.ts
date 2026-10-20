import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Do not let `next dev` write an AGENTS.md into the project.
  agentRules: false,
  // DELETE /v1/ must not be redirected to /v1: browsers refuse redirects after a CORS preflight.
  // src/proxy.ts serves it instead.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [{ source: "/", destination: "https://plexcord.club/cloud", permanent: false }];
  },
  async rewrites() {
    return [
      { source: "/gdpr", destination: "/gdpr.html" },
      { source: "/privacy", destination: "/privacy.html" },
    ];
  },
};

export default nextConfig;
