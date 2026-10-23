import type { NextConfig } from "next";

const backendOrigin = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Proxy for https pages talking to an http-only backend (see lib/apiBase.ts).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendOrigin}/api/:path*` }];
  },
};

export default nextConfig;
