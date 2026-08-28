"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";

export function LoginScreen() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <header className="app-header">
        <div className="topbar">
          <div className="brand">
            <span className="mark" aria-hidden="true">
              MC
            </span>
            <h1>Carrier Verifier</h1>
          </div>
        </div>
      </header>
      <main className="login-main">
        <form className="login-card" onSubmit={onSubmit}>
          <p className="login-kicker">Dispatcher desk</p>
          <h2>Sign in</h2>
          <p className="hint">One device at a time. A new sign-in closes the other session.</p>
          {notice ? (
            <p className="banner error" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="banner error" role="alert">
              {error}
            </p>
          ) : null}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
