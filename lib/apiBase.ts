const CONFIGURED = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

/**
 * Browsers block http:// API calls from an https:// page (mixed content). In that case call the
 * same origin instead — next.config.ts rewrites /api/* to NEXT_PUBLIC_API_URL on the server.
 */
export const API_BASE =
  typeof window !== "undefined" && window.location.protocol === "https:" && CONFIGURED.startsWith("http://")
    ? ""
    : CONFIGURED;

