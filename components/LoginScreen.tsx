"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, Suspense } from "react";
import { useAuth } from "./AuthProvider";
import { AuthShell } from "./AuthShell";
import { AuthField } from "./AuthField";
import { EMAIL_MAX, PASSWORD_MAX, loginEmailError, loginPasswordError, validateLogin, type FieldErrors } from "@/lib/credentials";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function LoginForm() {
  const { login, notice, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(next.startsWith("/") ? next : "/dashboard");
  }, [ready, user, router, next]);

  function clearField(field: keyof FieldErrors) {
    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const checked = validateLogin({ email, password });
    if (!checked.ok) {
      setErrors(checked.errors);
      setError(null);
      const first = checked.errors.email ? "login-email" : "login-password";
      document.getElementById(first)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      await login(checked.values.email, checked.values.password);
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      const payload = isRecord(err) ? err : {};
      const fieldErrors =
        isRecord(payload.errors) &&
        Object.fromEntries(
          Object.entries(payload.errors).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        );
      if (fieldErrors && Object.keys(fieldErrors).length) {
        setErrors(fieldErrors as FieldErrors);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Unable to sign in");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
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
      <AuthField
        id="login-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="username"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          clearField("email");
        }}
        onBlur={() => {
          const message = loginEmailError(email);
          if (email && message) setErrors((current) => ({ ...current, email: message }));
        }}
        error={errors.email}
        required
        autoFocus
        maxLength={EMAIL_MAX}
        spellCheck={false}
      />
      <AuthField
        id="login-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          clearField("password");
        }}
        onBlur={() => {
          const message = loginPasswordError(password);
          if (password && message) setErrors((current) => ({ ...current, password: message }));
        }}
        error={errors.password}
        required
        maxLength={PASSWORD_MAX}
      />
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
