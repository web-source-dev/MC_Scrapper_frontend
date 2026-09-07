export const TOKEN_KEY = "cv-session";
export const AUTH_EVENT = "cv-auth";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  role?: "dispatcher" | "admin";
  plan?: string;
  planName?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  usedToday?: number;
  usedThisMonth?: number;
  remainingDaily?: number;
  remainingMonthly?: number;
  remaining?: number;
  date?: string;
  timezone?: string;
  serverNow?: number;
  serverDate?: string;
  history?: Array<{ date: string; used: number }>;
  totalUsed?: number;
  banned?: boolean;
};

export class AuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 401, code = "UNAUTHENTICATED") {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "x-client-now": String(Date.now()),
  };
}
