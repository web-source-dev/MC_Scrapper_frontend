"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, Suspense } from "react";
import { useAuth } from "./AuthProvider";
import { AuthShell } from "./AuthShell";

function LoginForm() {
  const { login, notice, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(next.startsWith("/") ? next : "/dashboard");
  }, [ready, user, router, next]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <p className="auth-hint">One device at a time. A new sign-in closes the other session.</p>
      {notice ? (
        <p className="auth-banner" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="auth-banner" role="alert">
          {error}
        </p>
      ) : null}
      <label className="auth-field">
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
      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <button type="submit" className="lp-btn lp-btn-solid auth-submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function LoginScreen() {
  return (
    <AuthShell
      mode="login"
      title="Back to the desk."
      lede="Sign in to search SAFER-active, MC-authorized carriers — with day and month caps that stay honest."
    >
      <Suspense fallback={<p className="auth-hint">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
