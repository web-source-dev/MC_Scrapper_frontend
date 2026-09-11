import type { Carrier, DispatcherReview, MetaResponse, QcSnapshot, SearchFormState, VerifyResponse } from "./types";
import { AuthError, authHeaders, clearToken, getToken, setToken, type AuthUser } from "./session";
import { wakeBackend } from "./wakeBackend";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
    field?: string;
    errors?: Record<string, string>;
    resendIn?: number;
  };
  if (response.status === 401 || (response.status === 403 && payload.code === "ACCOUNT_BANNED")) {
    clearToken();
    throw new AuthError(
      payload.error || "Session ended. Sign in again.",
      response.status,
      payload.code || "UNAUTHENTICATED",
    );
  }
  if (response.status === 403 && payload.code === "CLOCK_SKEW") {
    throw new AuthError(payload.error || "Correct the day and date on this computer.", 403, "CLOCK_SKEW");
  }
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`) as Error & {
      status: number;
      code?: string;
      field?: string;
      errors?: Record<string, string>;
      resendIn?: number;
    };
    error.status = response.status;
    error.code = payload.code;
    error.field = payload.field;
    error.errors = payload.errors;
    if (typeof payload.resendIn === "number") error.resendIn = payload.resendIn;
    throw error;
  }
  return payload;
}

export async function login(email: string, password: string) {
  await wakeBackend();
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await readJson<{ ok: boolean; token: string; user: AuthUser }>(response);
  setToken(payload.token);
  return payload.user;
}

export async function startSignup(input: {
  name: string;
  company: string;
  phone: string;
  email: string;
  password: string;
}) {
  await wakeBackend();
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{ ok: boolean; needsVerification: boolean; email: string; expiresIn: number; resendIn: number }>(
    response,
  );
}

export async function verifySignup(email: string, otp: string) {
  await wakeBackend();
  const response = await fetch(`${API_BASE}/api/auth/signup/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const payload = await readJson<{ ok: boolean; token: string; user: AuthUser }>(response);
  setToken(payload.token);
  return payload.user;
}

export async function resendSignupOtp(email: string) {
  await wakeBackend();
  const response = await fetch(`${API_BASE}/api/auth/signup/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return readJson<{ ok: boolean; email: string; expiresIn: number; resendIn: number }>(response);
}

export async function fetchPublicPlans() {
  const response = await fetch(`${API_BASE}/api/plans`);
  const payload = await readJson<{
    ok: boolean;
    plans: Array<{
      id: string;
      name: string;
      dailyLimit: number | null;
      monthlyLimit: number | null;
      features?: string[];
    }>;
  }>(response);
  return payload.plans;
}

export async function logout() {
  const token = getToken();
  try {
    if (token) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: authHeaders(),
      });
    }
  } finally {
    clearToken();
  }
}

export async function fetchMe() {
  await wakeBackend();
  const response = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
  const payload = await readJson<{ ok: boolean; user: AuthUser }>(response);
  return payload.user;
}

export async function fetchMeta(): Promise<MetaResponse> {
  const response = await fetch(`${API_BASE}/api/meta`, { headers: authHeaders() });
  return readJson<MetaResponse>(response);
}

export async function verifyCarriers(form: SearchFormState): Promise<VerifyResponse> {
  await wakeBackend();
  const response = await fetch(`${API_BASE}/api/verify`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(form),
  });
  return readJson<VerifyResponse>(response);
}

export async function fetchCarrierSnapshot(params: {
  mc?: number | null;
  dot?: number | null;
}): Promise<QcSnapshot> {
  const search = new URLSearchParams();
  if (params.mc) search.set("mc", String(params.mc));
  if (params.dot) search.set("dot", String(params.dot));
  const response = await fetch(`${API_BASE}/api/carriers/snapshot?${search.toString()}`, {
    headers: authHeaders(),
  });
  const payload = await readJson<{ ok: boolean; snapshot: QcSnapshot }>(response);
  return payload.snapshot;
}

export async function fetchCarrierReviews(params: { mc?: number | null; dot?: number | null }) {
  const search = new URLSearchParams();
  if (params.mc) search.set("mc", String(params.mc));
  if (params.dot) search.set("dot", String(params.dot));
  const response = await fetch(`${API_BASE}/api/carriers/reviews?${search.toString()}`, {
    headers: authHeaders(),
  });
  const payload = await readJson<{ ok: boolean; reviews: DispatcherReview[] }>(response);
  return payload.reviews;
}

export async function draftCarrierReview(carrier: Carrier, words: string[], signal?: AbortSignal) {
  const response = await fetch(`${API_BASE}/api/carriers/reviews/draft`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ carrier, words }),
    signal,
  });
  const payload = await readJson<{ ok: boolean; text: string }>(response);
  return payload.text;
}

export async function saveCarrierReview(body: {
  mcNumber?: number | null;
  mcDisplay?: string | null;
  dotNumber?: number | null;
  legalName?: string | null;
  kind?: DispatcherReview["kind"];
  tags?: string[];
  note: string;
  dispatcher?: string | null;
}) {
  const response = await fetch(`${API_BASE}/api/carriers/reviews`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const payload = await readJson<{ ok: boolean; review: DispatcherReview }>(response);
  return payload.review;
}

export async function fetchEmailStatus() {
  const response = await fetch(`${API_BASE}/api/email/status`, { headers: authHeaders() });
  return readJson<import("./types").EmailStatus>(response);
}

export async function fetchGmailConnectUrl() {
  const returnOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const search = returnOrigin ? `?returnOrigin=${encodeURIComponent(returnOrigin)}` : "";
  const response = await fetch(`${API_BASE}/api/email/oauth/url${search}`, { headers: authHeaders() });
  return readJson<{
    ok: boolean;
    url: string;
    redirectUri?: string;
    returnOrigin?: string;
    setupWarning?: string | null;
  }>(response);
}

export async function disconnectGmail(accountId?: string) {
  const response = await fetch(`${API_BASE}/api/email/disconnect`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(accountId ? { accountId } : {}),
  });
  return readJson<{ ok: boolean; connected: boolean; accounts: import("./types").EmailAccount[] }>(response);
}

export async function setDefaultGmailAccount(accountId: string) {
  const response = await fetch(`${API_BASE}/api/email/accounts/default`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ accountId }),
  });
  return readJson<{
    ok: boolean;
    account: import("./types").EmailAccount;
    accounts: import("./types").EmailAccount[];
  }>(response);
}

export async function saveEmailTemplate(body: {
  id?: string;
  name: string;
  subject: string;
  body: string;
  isDefault?: boolean;
}) {
  const response = await fetch(
    body.id ? `${API_BASE}/api/email/templates/${body.id}` : `${API_BASE}/api/email/templates`,
    {
      method: body.id ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );
  return readJson<{ ok: boolean; template: import("./types").EmailTemplate }>(response);
}

export async function deleteEmailTemplate(id: string) {
  const response = await fetch(`${API_BASE}/api/email/templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return readJson<{ ok: boolean }>(response);
}

export async function sendCarrierEmail(body: {
  to: string;
  subject?: string;
  body?: string;
  templateId?: string;
  accountId?: string;
  vars?: Record<string, string>;
}) {
  const response = await fetch(`${API_BASE}/api/email/send`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return readJson<{ ok: boolean; from: string; messageId?: string }>(response);
}

export async function sendBulkCarrierEmails(body: {
  templateId: string;
  accountId?: string;
  recipients: Array<{ to: string; vars?: Record<string, string> }>;
}) {
  const response = await fetch(`${API_BASE}/api/email/send-bulk`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return readJson<{
    ok: boolean;
    from: string;
    sent: Array<{ to: string; messageId?: string }>;
    failed: Array<{ to: string; error: string }>;
    skipped: Array<{ to: string; reason: string }>;
  }>(response);
}

export async function fetchSentEmails() {
  const response = await fetch(`${API_BASE}/api/email/sent`, { headers: authHeaders() });
  return readJson<{ ok: boolean; sent: Array<{ id: string; from: string; to: string; subject: string; createdAt: string }> }>(
    response,
  );
}

export async function fetchCarrierBrief(carrier: Carrier, snapshot?: QcSnapshot | null) {
  const response = await fetch(`${API_BASE}/api/carriers/brief`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ carrier, snapshot: snapshot || carrier.snapshot || null }),
  });
  return readJson<{ ok: boolean; text: string; model: string }>(response);
}
