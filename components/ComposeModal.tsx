"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchEmailStatus, saveEmailTemplate, sendCarrierEmail } from "@/lib/api";
import { applyEmailTemplate, readEmailDraft } from "@/lib/email";
import type { EmailStatus, EmailTemplate } from "@/lib/types";

type Props = {
  onClose: () => void;
  onOpenTemplates: () => void;
  onOpenGmail?: () => void;
};

function pickTemplate(templates: EmailTemplate[], id?: string) {
  if (id) return templates.find((item) => item.id === id) || null;
  return templates.find((item) => item.isDefault) || templates[0] || null;
}

function dash(value?: string) {
  const text = String(value || "").trim();
  return text || "—";
}

function insertAtCursor(
  field: HTMLInputElement | HTMLTextAreaElement,
  token: string,
  setter: (value: string) => void,
) {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  const next = `${field.value.slice(0, start)}${token}${field.value.slice(end)}`;
  setter(next);
  window.requestAnimationFrame(() => {
    field.focus();
    const cursor = start + token.length;
    field.setSelectionRange(cursor, cursor);
  });
}

export function ComposeModal({ onClose, onOpenTemplates, onOpenGmail }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const toRef = useRef<HTMLInputElement | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const lastField = useRef<"subject" | "body">("body");
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [accountId, setAccountId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});

  const templates = status?.templates || [];
  const accounts = status?.accounts || [];
  const selected = useMemo(() => pickTemplate(templates, templateId), [templates, templateId]);
  const connected = Boolean(status?.connected && accounts.length);
  const merged = { ...vars, to, email: to };
  const previewSubject = applyEmailTemplate(subject, merged);
  const previewBody = applyEmailTemplate(body, merged);

  function apply(template: EmailTemplate | null, nextTo: string, nextVars: Record<string, string>) {
    if (!template) {
      setTemplateId("");
      return;
    }
    const nextMerged = { ...nextVars, to: nextTo, email: nextTo };
    setTemplateId(template.id);
    setSubject(applyEmailTemplate(template.subject, nextMerged));
    setBody(applyEmailTemplate(template.body, nextMerged));
  }

  useEffect(() => {
    const draft = readEmailDraft();
    fetchEmailStatus()
      .then((next) => {
        setStatus(next);
        const inbox = next.accounts.find((item) => item.isDefault) || next.accounts[0];
        if (inbox) setAccountId(inbox.id);
        const nextTo = draft?.to || "";
        const nextVars = draft?.vars || {};
        if (draft) {
          setTo(nextTo);
          setVars(nextVars);
        }
        apply(pickTemplate(next.templates), nextTo, nextVars);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load email"));
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    toRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function insertToken(token: string) {
    if (lastField.current === "subject" && subjectRef.current) {
      insertAtCursor(subjectRef.current, token, setSubject);
      return;
    }
    if (bodyRef.current) insertAtCursor(bodyRef.current, token, setBody);
  }

  async function send() {
    setBusy("send");
    setError(null);
    try {
      const result = await sendCarrierEmail({
        to,
        subject,
        body,
        templateId: templateId || undefined,
        accountId: accountId || undefined,
        vars: merged,
      });
      setNotice(`Sent from ${result.from}`);
      window.setTimeout(onClose, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send");
    } finally {
      setBusy("");
    }
  }

  async function saveAsTemplate() {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const name = (selected?.name || vars.company || "Saved from compose").replace(/\s*\(default\)\s*$/i, "").trim();
      await saveEmailTemplate({ name, subject, body, isDefault: false });
      const next = await fetchEmailStatus();
      setStatus(next);
      const created = next.templates.find((item) => item.name === name);
      if (created) setTemplateId(created.id);
      setNotice("Template saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save template");
    } finally {
      setBusy("");
    }
  }

  const location = [vars.city, vars.state, vars.zip].filter(Boolean).join(", ");

  return (
    <div
      className="dat-compose-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="dat-compose" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className="dat-compose-head">
          <div className="dat-compose-title-wrap">
            <span className="dat-brand-bar" aria-hidden="true" />
            <h2 id="compose-title">Email carrier</h2>
          </div>
          <button type="button" className="dat-icon-btn" onClick={onClose} aria-label="Close compose">
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
          {notice ? (
            <p className="dat-msg ok" role="status">
              {notice}
            </p>
          ) : null}

          <div className="dat-compose-grid">
            <div className="dat-compose-main">
              <div className="dat-field">
                <label htmlFor="compose-to">To</label>
                <input
                  ref={toRef}
                  id="compose-to"
                  className="dat-input"
                  type="email"
                  value={to}
                  placeholder="carrier@example.com"
                  onChange={(event) => setTo(event.target.value)}
                />
              </div>
              <div className="dat-grid-2">
                <div className="dat-field">
                  <label htmlFor="compose-from">From inbox</label>
                  <select
                    id="compose-from"
                    className="dat-input"
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                  >
                    {accounts.length ? (
                      accounts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.email}
                          {item.isDefault ? " (default)" : ""}
                        </option>
                      ))
                    ) : (
                      <option value="">0 accounts connected</option>
                    )}
                  </select>
                </div>
                <div className="dat-field">
                  <label htmlFor="compose-template">Template</label>
                  <select
                    id="compose-template"
                    className="dat-input"
                    value={templateId}
                    onChange={(event) => {
                      const id = event.target.value;
                      if (!id) {
                        setTemplateId("");
                        return;
                      }
                      apply(pickTemplate(templates, id), to, vars);
                    }}
                  >
                    <option value="">— No template / custom —</option>
                    {templates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="dat-field">
                <label htmlFor="compose-subject">Subject</label>
                <input
                  ref={subjectRef}
                  id="compose-subject"
                  className="dat-input"
                  value={subject}
                  onFocus={() => {
                    lastField.current = "subject";
                  }}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
              <div className="dat-chips">
                {(status?.variables || []).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="dat-chip"
                    title={`Insert ${item.label} (${item.token})`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertToken(item.token)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="dat-field">
                <label htmlFor="compose-body">Message</label>
                <textarea
                  ref={bodyRef}
                  id="compose-body"
                  className="dat-input dat-textarea"
                  value={body}
                  onFocus={() => {
                    lastField.current = "body";
                  }}
                  onChange={(event) => setBody(event.target.value)}
                />
              </div>
              <div className="dat-compose-actions">
                <button
                  type="button"
                  className="dat-btn dat-btn-primary"
                  disabled={Boolean(busy) || !connected || !to || !subject || !body.trim()}
                  onClick={() => void send()}
                >
                  {busy === "send" ? "Sending…" : "Send email"}
                </button>
                <button
                  type="button"
                  className="dat-btn dat-btn-linkish"
                  disabled={Boolean(busy) || !subject.trim() || !body.trim()}
                  onClick={() => void saveAsTemplate()}
                >
                  {busy === "save" ? "Saving…" : "Save as template"}
                </button>
              </div>
              {!connected ? (
                <p className="dat-hint">
                  {status?.setupWarning ||
                    (accounts.length === 0
                      ? "No Gmail accounts connected yet. Connect one or more on the Gmail page."
                      : "Connect Gmail before sending.")}{" "}
                  <button type="button" className="dat-text-link" onClick={onOpenGmail || onOpenTemplates}>
                    Open Gmail
                  </button>
                </p>
              ) : (
                <p className="dat-hint">
                  Sending from {accounts.find((item) => item.id === accountId)?.email || "selected inbox"} ·{" "}
                  {accounts.length} connected.
                </p>
              )}
            </div>

            <aside className="dat-compose-side">
              <div className="dat-box">
                <p className="dat-box-title">Carrier context</p>
                <dl className="dat-kv">
                  <dt>Company</dt>
                  <dd>{dash(vars.company)}</dd>
                  <dt>MC</dt>
                  <dd className="mono">{dash(vars.mc)}</dd>
                  <dt>USDOT</dt>
                  <dd className="mono">{dash(vars.dot)}</dd>
                  <dt>Officer</dt>
                  <dd>{dash(vars.officer)}</dd>
                  <dt>Phone</dt>
                  <dd className="mono">{dash(vars.phone)}</dd>
                  <dt>Location</dt>
                  <dd>{dash(location)}</dd>
                  <dt>Email</dt>
                  <dd>{dash(vars.email || to)}</dd>
                </dl>
              </div>
              <div className="dat-box">
                <p className="dat-box-title">Preview</p>
                <div className="dat-preview">
                  <strong className="dat-preview-subject">{previewSubject || "(no subject)"}</strong>
                  <span className="dat-preview-body">{previewBody || "Message preview will appear here."}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
