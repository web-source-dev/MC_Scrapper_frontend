"use client";

import { useEffect, useState } from "react";
import {
  disconnectGmail,
  fetchEmailStatus,
  fetchGmailConnectUrl,
  setDefaultGmailAccount,
} from "@/lib/api";
import type { EmailAccount, EmailStatus } from "@/lib/types";

function accountInitial(account: EmailAccount) {
  const source = account.displayName || account.email || "?";
  return source.trim().charAt(0).toUpperCase() || "G";
}

export function GmailPage() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  const accounts = status?.accounts || [];
  const accountCount = status?.accountCount ?? accounts.length;
  const connected = accountCount > 0;
  const defaultAccount = accounts.find((item) => item.isDefault) || accounts[0] || null;

  function flash(message: string, isError = false) {
    if (isError) {
      setError(message);
      setNotice(null);
    } else {
      setNotice(message);
      setError(null);
    }
  }

  async function reload() {
    const next = await fetchEmailStatus();
    setStatus(next);
    return next;
  }

  useEffect(() => {
    const justConnected = window.sessionStorage.getItem("cv-gmail-just-connected");
    if (justConnected) window.sessionStorage.removeItem("cv-gmail-just-connected");

    reload()
      .then((next) => {
        if (justConnected) {
          const count = next.accountCount ?? next.accounts.length;
          if (count > 0) {
            flash(
              count === 1
                ? `Gmail connected: ${next.accounts[0]?.email || justConnected}`
                : `${count} Gmail accounts connected · latest ${justConnected}`,
            );
          } else {
            flash(
              next.setupWarning ||
                "Google returned success, but no account was saved on this API. Check GOOGLE_OAUTH_REDIRECT_URI points at this backend.",
              true,
            );
          }
        }
      })
      .catch((err) => flash(err instanceof Error ? err.message : "Unable to load Gmail", true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!notice && !error) return;
    const timer = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [notice, error]);

  async function connectGmail() {
    setBusy("connect");
    try {
      const payload = await fetchGmailConnectUrl();
      if (payload.setupWarning) {
        flash(payload.setupWarning, true);
        setBusy("");
        return;
      }
      window.location.href = payload.url;
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to start Gmail connect", true);
      setBusy("");
    }
  }

  async function disconnect(accountId: string) {
    const account = accounts.find((item) => item.id === accountId);
    if (!window.confirm(`Disconnect ${account?.email || "this Gmail account"}?`)) return;
    setBusy(`disconnect:${accountId}`);
    try {
      await disconnectGmail(accountId);
      await reload();
      flash("Gmail account disconnected");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to disconnect", true);
    } finally {
      setBusy("");
    }
  }

  async function makeDefault(accountId: string) {
    setBusy(`default:${accountId}`);
    try {
      const result = await setDefaultGmailAccount(accountId);
      setStatus((current) =>
        current
          ? {
              ...current,
              account: result.account,
              accounts: result.accounts,
              connected: result.accounts.length > 0,
              accountCount: result.accounts.length,
            }
          : current,
      );
      flash(`Default inbox set to ${result.account.email}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to set default inbox", true);
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <div className="mail-studio">
        <div className="mail-studio-skeleton" aria-busy="true" aria-label="Loading Gmail">
          <div className="mail-skel mail-skel-bar" />
          <div className="mail-skel mail-skel-editor" style={{ minHeight: 280 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-studio">
      <header className="mail-studio-top">
        <div className="mail-studio-title">
          <p className="mail-eyebrow">Mail</p>
          <h2>Gmail accounts</h2>
          <p className="mail-lede">
            Connect as many Gmail inboxes as you need. Pick a default for compose and bulk send.
          </p>
        </div>
        <div className="mail-studio-metrics">
          <div className="mail-metric">
            <span>Connected</span>
            <strong>{accountCount}</strong>
          </div>
          <div className="mail-metric">
            <span>Default</span>
            <strong>{connected ? "On" : "—"}</strong>
          </div>
          <div className="mail-metric">
            <span>OAuth</span>
            <strong>{status?.oauthAvailable === false ? "Off" : "Ready"}</strong>
          </div>
        </div>
      </header>

      {status && status.oauthAvailable === false ? (
        <p className="banner warn" role="status">
          Google OAuth is not configured on the API. Add this redirect URI in Google Cloud:{" "}
          {status.redirectUri || "http://localhost:4000/api/email/oauth/callback"}
        </p>
      ) : null}
      {status?.setupWarning ? (
        <p className="banner warn" role="status">
          {status.setupWarning}
        </p>
      ) : null}
      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="banner">{notice}</p> : null}

      <section className="mail-accounts-panel mail-accounts-panel-open mail-studio-fill">
        <div className="mail-panel-head">
          <div>
            <strong>Connected inboxes</strong>
            <span>
              {connected
                ? `Default · ${defaultAccount?.email || "none"}`
                : "No accounts connected yet"}
            </span>
          </div>
          <button
            type="button"
            className="primary"
            disabled={Boolean(busy) || !status || status.oauthAvailable === false}
            onClick={() => void connectGmail()}
          >
            {busy === "connect" ? "Opening Google…" : connected ? "Add Gmail" : "Connect Gmail"}
          </button>
        </div>

        {connected ? (
          <ul className="mail-account-grid">
            {accounts.map((account) => (
              <li key={account.id} className={account.isDefault ? "is-default" : undefined}>
                <span className="mail-account-avatar" aria-hidden="true">
                  {accountInitial(account)}
                </span>
                <div className="mail-account-copy">
                  <strong>
                    {account.email}
                    {account.isDefault ? <span className="mail-badge">Default</span> : null}
                  </strong>
                  <span>{account.displayName || "Connected with Google"}</span>
                </div>
                <div className="mail-account-actions">
                  {!account.isDefault ? (
                    <button type="button" className="text-btn" disabled={Boolean(busy)} onClick={() => void makeDefault(account.id)}>
                      Set default
                    </button>
                  ) : (
                    <span className="mail-account-default-label">Sending default</span>
                  )}
                  <button
                    type="button"
                    className="text-btn danger"
                    disabled={Boolean(busy)}
                    onClick={() => void disconnect(account.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mail-empty-accounts">
            <div>
              <strong>Connect Gmail to start sending</strong>
              <p>You can attach multiple inboxes to this user and choose which one to send from.</p>
            </div>
            <button
              type="button"
              className="primary"
              disabled={Boolean(busy) || !status || status.oauthAvailable === false}
              onClick={() => void connectGmail()}
            >
              Connect Gmail
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
