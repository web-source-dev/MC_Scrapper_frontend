const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Free-tier hosts can take ~60s to cold start; allow enough time for the wake ping. */
const WAKE_TIMEOUT_MS = 120_000;

let wakePromise: Promise<boolean> | null = null;

export function wakeBackend(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!wakePromise) {
    wakePromise = fetch(`${API_BASE}/api/ping`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(WAKE_TIMEOUT_MS),
    })
      .then((response) => response.ok)
      .catch(() => false);
  }
  return wakePromise;
}
