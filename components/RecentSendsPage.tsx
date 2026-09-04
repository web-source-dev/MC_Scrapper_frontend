"use client";

import { useEffect, useState } from "react";
import { fetchSentEmails } from "@/lib/api";
import { openComposeEmail, openGmailPage } from "@/lib/email";

function formatSentAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecentSendsPage() {
  const [sent, setSent] = useState<Array<{ id: string; from?: string; to: string; subject: string; createdAt: string }>>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function reload() {
    setBusy(true);
    try {
      const history = await fetchSentEmails();
      setSent(history.sent);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load recent sends");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  if (loading) {
    return (
      <div className="mail-studio">
        <div className="mail-studio-skeleton" aria-busy="true" aria-label="Loading recent sends">
          <div className="mail-skel mail-skel-bar" />
          <div className="mail-skel mail-skel-editor" style={{ minHeight: 320 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-studio">
      <header className="mail-studio-top">
        <div className="mail-studio-title">
          <p className="mail-eyebrow">Mail</p>
          <h2>Recent sends</h2>
          <p className="mail-lede">Last messages sent from this desk via compose or bulk email.</p>
        </div>
        <div className="mail-studio-metrics">
          <div className="mail-metric">
            <span>Shown</span>
            <strong>{sent.length}</strong>
          </div>
          <div className="mail-metric">
            <span>Limit</span>
            <strong>30</strong>
          </div>
          <div className="mail-metric">
            <span>Status</span>
            <strong>{busy ? "…" : "Live"}</strong>
          </div>
        </div>
      </header>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mail-activity mail-activity-page mail-studio-fill">
        <div className="mail-activity-head">
          <h3>Send history</h3>
          <button type="button" className="text-btn" disabled={busy} onClick={() => void reload()}>
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {sent.length ? (
          <ul className="mail-activity-list">
            {sent.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.to}</strong>
                  <span>
                    {item.from ? `From ${item.from} · ` : ""}
                    {item.subject || "(no subject)"}
                  </span>
                </div>
                <em>{formatSentAt(item.createdAt)}</em>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mail-empty-accounts" style={{ margin: "12px 0 0" }}>
            <div>
              <strong>No sends yet</strong>
              <p>Messages from compose and bulk email will appear here.</p>
            </div>
            <div className="mail-studio-actions">
              <button type="button" className="ghost" onClick={() => openGmailPage()}>
                Gmail
              </button>
              <button type="button" className="primary" onClick={() => openComposeEmail()}>
                Compose
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
