"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteEmailTemplate,
  disconnectGmail,
  fetchEmailStatus,
  fetchGmailConnectUrl,
  fetchSentEmails,
  saveEmailTemplate,
} from "@/lib/api";
import { openComposeEmail } from "@/lib/email";
import type { EmailStatus, EmailTemplate } from "@/lib/types";

const EMPTY_TEMPLATE = { name: "", subject: "", body: "", isDefault: false };

function formatSentAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function TemplatesPage() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [sent, setSent] = useState<Array<{ id: string; to: string; subject: string; createdAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const selected = useMemo(
    () => status?.templates.find((item) => item.id === selectedId) || null,
    [status, selectedId],
  );

  function flash(message: string, isError = false) {
    if (isError) {
      setError(message);
      setNotice(null);
    } else {
      setNotice(message);
      setError(null);
    }
  }

  function selectTemplate(template: EmailTemplate) {
    setSelectedId(template.id);
    setDraft({
      name: template.name,
      subject: template.subject,
      body: template.body,
      isDefault: template.isDefault,
    });
  }

  async function reload() {
    const [next, history] = await Promise.all([fetchEmailStatus(), fetchSentEmails()]);
    setStatus(next);
    setSent(history.sent);
    return next;
  }

  useEffect(() => {
    reload()
      .then((next) => {
        const template = next.templates.find((item) => item.isDefault) || next.templates[0];
        if (template) selectTemplate(template);
      })
      .catch((err) => flash(err instanceof Error ? err.message : "Unable to load templates", true));
  }, []);

  useEffect(() => {
    if (!notice && !error) return;
    const timer = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [notice, error]);

  async function connectGmail() {
    setBusy("connect");
    try {
      const payload = await fetchGmailConnectUrl();
      window.location.href = payload.url;
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to start Gmail connect", true);
      setBusy("");
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    try {
      await disconnectGmail(status?.account?.id);
      await reload();
      flash("Gmail disconnected");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to disconnect", true);
    } finally {
      setBusy("");
    }
  }

  async function saveTemplate() {
    setBusy("save");
    try {
      const payload = await saveEmailTemplate({
        id: selectedId || undefined,
        ...draft,
      });
      const next = await reload();
      const template = next.templates.find((item) => item.id === payload.template.id);
      if (template) selectTemplate(template);
      flash("Template saved");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to save template", true);
    } finally {
      setBusy("");
    }
  }

  async function removeTemplate(template: EmailTemplate) {
    if (!window.confirm(`Delete “${template.name}”?`)) return;
    setBusy("delete");
    try {
      await deleteEmailTemplate(template.id);
      setSelectedId("");
      setDraft(EMPTY_TEMPLATE);
      const next = await reload();
      const fallback = next.templates.find((item) => item.isDefault) || next.templates[0];
      if (fallback) selectTemplate(fallback);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to delete template", true);
    } finally {
      setBusy("");
    }
  }

  function insertToken(token: string) {
    const field = bodyRef.current;
    if (!field) {
      setDraft((current) => ({ ...current, body: `${current.body}${token}` }));
      return;
    }
    const start = field.selectionStart ?? draft.body.length;
    const end = field.selectionEnd ?? start;
    const next = `${draft.body.slice(0, start)}${token}${draft.body.slice(end)}`;
    setDraft((current) => ({ ...current, body: next }));
    window.requestAnimationFrame(() => {
      field.focus();
      const cursor = start + token.length;
      field.setSelectionRange(cursor, cursor);
    });
  }

  const account = status?.account;
  const connected = Boolean(status?.connected && account);

  return (
    <div className="workspace email-desk">
      <div className="workspace-main">
        <section className="search-card email-connect">
          <div>
            <p className="kicker">Mail</p>
            <h2>Gmail & templates</h2>
            <p>
              {connected
                ? `Connected as ${account?.displayName || account?.email}`
                : "Connect Gmail, then build reusable carrier templates."}
            </p>
          </div>
          <div className="email-connect-actions">
            {connected ? <span className="status-pill is-ok">Connected</span> : <span className="status-pill is-wait">Not connected</span>}
            {connected ? (
              <button type="button" className="ghost" disabled={Boolean(busy)} onClick={() => void disconnect()}>
                Disconnect
              </button>
            ) : null}
            <button
              type="button"
              className="ghost"
              onClick={() => openComposeEmail()}
            >
              New message
            </button>
            <button
              type="button"
              className="primary"
              disabled={Boolean(busy) || !status || status.oauthAvailable === false}
              onClick={() => void connectGmail()}
            >
              {connected ? "Reconnect Gmail" : "Connect Gmail"}
            </button>
          </div>
        </section>

        {status && status.oauthAvailable === false ? (
          <p className="banner warn" role="status">
            Google OAuth is not configured on the API. Add this redirect URI in Google Cloud:{" "}
            {status.redirectUri || "http://localhost:4000/api/email/oauth/callback"}
          </p>
        ) : null}
        {error ? (
          <p className="banner error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? <p className="banner">{notice}</p> : null}

        <div className="email-grid">
          <section className="search-card">
            <div className="email-head">
              <h2>Templates</h2>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setSelectedId("");
                  setDraft(EMPTY_TEMPLATE);
                }}
              >
                New
              </button>
            </div>
            <div className="email-template-list">
              {(status?.templates || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selectedId ? "email-template is-on" : "email-template"}
                  onClick={() => selectTemplate(item)}
                >
                  <strong>
                    {item.name}
                    {item.isDefault ? <span className="chip">Default</span> : null}
                  </strong>
                  <span>{item.subject}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="search-card">
            <h2>{selectedId ? "Edit template" : "New template"}</h2>
            <div className="field">
              <label htmlFor="tpl-name">Name</label>
              <input
                id="tpl-name"
                value={draft.name}
                placeholder="Capacity check"
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="tpl-subject">Subject</label>
              <input
                id="tpl-subject"
                value={draft.subject}
                placeholder="MC {{mc}} — truck available"
                onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="tpl-body">Body</label>
              <textarea
                id="tpl-body"
                ref={bodyRef}
                rows={10}
                value={draft.body}
                placeholder="Hi {{officer}}, …"
                onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
              />
            </div>
            <p className="hint">Click a field to insert it at the cursor.</p>
            <div className="chips">
              {(status?.variables || []).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="chip button-chip"
                  title={item.label}
                  onClick={() => insertToken(item.token)}
                >
                  {item.token}
                </button>
              ))}
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))}
              />
              Default template
            </label>
            <div className="email-actions">
              <button type="button" className="primary" disabled={Boolean(busy)} onClick={() => void saveTemplate()}>
                {selectedId ? "Save template" : "Create template"}
              </button>
              {selected ? (
                <button type="button" className="ghost" disabled={Boolean(busy)} onClick={() => void removeTemplate(selected)}>
                  Delete
                </button>
              ) : null}
              <button
                type="button"
                className="ghost"
                onClick={() => openComposeEmail()}
              >
                Use in message
              </button>
            </div>
          </section>
        </div>

        {sent.length ? (
          <section className="search-card email-sent">
            <h3>Recent sends</h3>
            <ul>
              {sent.map((item) => (
                <li key={item.id}>
                  <strong>{item.to}</strong>
                  <span>{item.subject}</span>
                  <em>{formatSentAt(item.createdAt)}</em>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
