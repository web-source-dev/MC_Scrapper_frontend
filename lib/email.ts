import type { Carrier, EmailDraft } from "./types";

export const EMAIL_DRAFT_KEY = "cv-email-draft";
export const EMAIL_OPEN_EVENT = "cv-open-email";
export const EMAIL_TEMPLATES_EVENT = "cv-open-templates";
export const EMAIL_GMAIL_EVENT = "cv-open-gmail";
export const EMAIL_RECENT_EVENT = "cv-open-recent";

export function applyEmailTemplate(text: string, vars: Record<string, string> = {}) {
  return String(text || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, key) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return full;
    return vars[key] == null ? "" : String(vars[key]);
  });
}

export function carrierEmailVars(carrier: Carrier, to = ""): Record<string, string> {
  const addr = carrier.physicalAddress || {};
  const recipient = String(to || carrier.email || "").trim();
  return {
    company: String(carrier.dbaName || carrier.legalName || ""),
    legalName: String(carrier.legalName || ""),
    officer: String(carrier.officer || "there"),
    mc: String(carrier.mcDisplay || carrier.mcNumber || ""),
    dot: carrier.dotNumber ? String(carrier.dotNumber) : "",
    phone: String(carrier.phone || carrier.cellPhone || ""),
    email: recipient,
    city: String(addr.city || ""),
    state: String(addr.state || ""),
    zip: String(addr.zip || ""),
    trucks: String(carrier.trucks ?? ""),
    safety: String(carrier.safetyRating || ""),
    to: recipient,
  };
}

export function openComposeEmail(draft?: EmailDraft | null) {
  if (draft) {
    window.sessionStorage.setItem(EMAIL_DRAFT_KEY, JSON.stringify(draft));
  } else {
    window.sessionStorage.removeItem(EMAIL_DRAFT_KEY);
  }
  window.dispatchEvent(new Event(EMAIL_OPEN_EVENT));
}

export function openTemplatesPage() {
  window.dispatchEvent(new Event(EMAIL_TEMPLATES_EVENT));
}

export function openGmailPage() {
  window.dispatchEvent(new Event(EMAIL_GMAIL_EVENT));
}

export function openRecentSendsPage() {
  window.dispatchEvent(new Event(EMAIL_RECENT_EVENT));
}

export function openCarrierEmail(carrier: Carrier, to?: string) {
  const recipient = String(to || carrier.email || "").trim();
  openComposeEmail({ to: recipient, vars: carrierEmailVars(carrier, recipient) });
}

export function readEmailDraft(): EmailDraft | null {
  try {
    const raw = window.sessionStorage.getItem(EMAIL_DRAFT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(EMAIL_DRAFT_KEY);
    const parsed = JSON.parse(raw) as EmailDraft;
    return {
      to: String(parsed.to || ""),
      vars: parsed.vars && typeof parsed.vars === "object" ? parsed.vars : {},
    };
  } catch {
    return null;
  }
}
