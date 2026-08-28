"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchEmailStatus, sendBulkCarrierEmails } from "@/lib/api";
import { applyEmailTemplate, carrierEmailVars } from "@/lib/email";
import type { Carrier, EmailStatus } from "@/lib/types";

type Props = {
  carriers: Carrier[];
  selectedCount: number;
  onClose: () => void;
  onOpenTemplates: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BATCH = 40;

function uniqueRecipients(carriers: Carrier[]) {
  const seen = new Set<string>();
  const list: Array<{ to: string; vars: Record<string, string>; company: string }> = [];
  let skipped = 0;
  for (const carrier of carriers) {
    const to = String(carrier.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(to)) {
      skipped += 1;
      continue;
    }
    if (seen.has(to)) {
      skipped += 1;
      continue;
    }
    seen.add(to);
    const vars = carrierEmailVars(carrier, to);
    list.push({ to, vars, company: vars.company || carrier.legalName || to });
  }
  return { recipients: list, skipped };
}

export function BulkEmailModal({ carriers, selectedCount, onClose, onOpenTemplates }: Props) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, sent: 0, failed: 0, skipped: 0 });
  const [finished, setFinished] = useState(false);
  const [failures, setFailures] = useState<Array<{ to: string; error: string }>>([]);

  const pool = useMemo(() => uniqueRecipients(carriers), [carriers]);
  const template = status?.templates.find((item) => item.id === templateId) || null;
  const connected = Boolean(status?.connected && status.account);
  const preview = template
    ? {
        subject: applyEmailTemplate(template.subject, pool.recipients[0]?.vars || {}),
        body: applyEmailTemplate(template.body, pool.recipients[0]?.vars || {}),
      }
    : null;

  useEffect(() => {
    fetchEmailStatus()
      .then((next) => {
        setStatus(next);
        const fallback = next.templates.find((item) => item.isDefault) || next.templates[0];
        if (fallback) setTemplateId(fallback.id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load email"));
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function sendAll() {
    if (!templateId || !pool.recipients.length) return;
    setBusy(true);
    setFinished(false);
    setError(null);
    setFailures([]);
    setProgress({ done: 0, sent: 0, failed: 0, skipped: pool.skipped });

    let sent = 0;
    let failed = 0;
    const failedRows: Array<{ to: string; error: string }> = [];

    try {
      for (let i = 0; i < pool.recipients.length; i += BATCH) {
        const chunk = pool.recipients.slice(i, i + BATCH);
        const result = await sendBulkCarrierEmails({
          templateId,
          accountId: status?.account?.id,
          recipients: chunk.map((item) => ({ to: item.to, vars: item.vars })),
        });
        sent += result.sent.length;
        failed += result.failed.length;
        failedRows.push(...result.failed);
        setProgress({
          done: Math.min(i + chunk.length, pool.recipients.length),
          sent,
          failed,
          skipped: pool.skipped,
        });
      }
      setFailures(failedRows.slice(0, 8));
      setFinished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="dat-compose-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="dat-compose dat-bulk" role="dialog" aria-modal="true" aria-labelledby="bulk-title">
        <div className="dat-compose-head">
          <div className="dat-compose-title-wrap">
            <span className="dat-brand-bar" aria-hidden="true" />
            <h2 id="bulk-title">Bulk email</h2>
          </div>
          <button type="button" className="dat-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="dat-compose-body">
          {error ? (
            <p className="dat-msg err" role="alert">
              {error}
            </p>
          ) : null}

          <div className="dat-bulk-stats">
            <div>
              <span>Recipients</span>
              <strong>{pool.recipients.length}</strong>
            </div>
            <div>
              <span>{selectedCount ? "Selected" : "In list"}</span>
              <strong>{carriers.length}</strong>
            </div>
            <div>
              <span>No email</span>
              <strong>{pool.skipped}</strong>
            </div>
          </div>
          <p className="dat-hint">
            {selectedCount
              ? "Sending to checked rows that have an email. Uncheck all to send to the whole filtered list."
              : "No rows checked, so this sends to every carrier in the current list that has an email."}
          </p>

          <div className="dat-field">
            <label htmlFor="bulk-template">Template</label>
            <select
              id="bulk-template"
              className="dat-input"
              value={templateId}
              disabled={busy}
              onChange={(event) => setTemplateId(event.target.value)}
            >
              {(status?.templates || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {preview ? (
            <div className="dat-box">
              <p className="dat-box-title">Preview · first recipient</p>
              <div className="dat-preview">
                <strong className="dat-preview-subject">{preview.subject || "(no subject)"}</strong>
                <span className="dat-preview-body">{preview.body || "Empty template"}</span>
              </div>
            </div>
          ) : null}

          {busy || finished ? (
            <div className="dat-bulk-progress" role="status">
              <div className="dat-bulk-bar">
                <span
                  style={{
                    width: `${pool.recipients.length ? Math.round((progress.done / pool.recipients.length) * 100) : 0}%`,
                  }}
                />
              </div>
              <p>
                {busy
                  ? `Sending ${progress.done} of ${pool.recipients.length}…`
                  : `Finished · ${progress.sent} sent`}
                {progress.failed ? ` · ${progress.failed} failed` : ""}
              </p>
            </div>
          ) : null}

          {failures.length ? (
            <ul className="dat-bulk-fail">
              {failures.map((item) => (
                <li key={item.to}>
                  {item.to}: {item.error}
                </li>
              ))}
            </ul>
          ) : null}

          {!connected ? (
            <p className="dat-hint">
              Connect Gmail on the Templates page first.{" "}
              <button type="button" className="dat-text-link" onClick={onOpenTemplates}>
                Open Templates
              </button>
            </p>
          ) : null}

          <div className="dat-compose-actions">
            <button
              type="button"
              className="dat-btn dat-btn-primary"
              disabled={busy || !connected || !templateId || !pool.recipients.length}
              onClick={() => void sendAll()}
            >
              {busy
                ? "Sending…"
                : finished
                  ? "Send again"
                  : `Send to ${pool.recipients.length} ${pool.recipients.length === 1 ? "email" : "emails"}`}
            </button>
            <button type="button" className="dat-btn dat-btn-linkish" disabled={busy} onClick={onClose}>
              {finished ? "Done" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
