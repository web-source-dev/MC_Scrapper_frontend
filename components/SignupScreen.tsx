"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { AuthShell } from "./AuthShell";

const JOB_OPTIONS = [
  { id: "dispatcher", label: "Dispatcher" },
  { id: "broker", label: "Broker" },
  { id: "carrier_ops", label: "Carrier ops" },
  { id: "owner", label: "Owner / manager" },
  { id: "other", label: "Other" },
] as const;

export function SignupScreen() {
  const { signup, user, ready } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState<(typeof JOB_OPTIONS)[number]["id"]>("dispatcher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup({ name, company, phone, jobTitle, email, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      mode="signup"
      title="Start on Free."
      lede="1,000 MCs a day and 30,000 a month — then search, filter, and export from one dispatcher desk."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <p className="auth-hint">No card required. Upgrades are assigned by an administrator.</p>
        {error ? (
          <p className="auth-banner" role="alert">
            {error}
          </p>
        ) : null}

        <div className="auth-field-row">
          <label className="auth-field">
            <span>Full name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="auth-field">
            <span>Company</span>
            <input
              type="text"
              autoComplete="organization"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              required
              placeholder="Brokerage or desk"
            />
          </label>
        </div>

        <div className="auth-field-row">
          <label className="auth-field">
            <span>Phone</span>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              placeholder="Desk or mobile"
            />
          </label>
          <label className="auth-field">
            <span>Role</span>
            <select value={jobTitle} onChange={(event) => setJobTitle(event.target.value as typeof jobTitle)}>
              {JOB_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="auth-field">
          <span>Work email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <div className="auth-field-row">
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
        </div>

        <button type="submit" className="lp-btn lp-btn-solid auth-submit" disabled={busy}>
          {busy ? "Creating…" : "Create free account"}
        </button>
      </form>
    </AuthShell>
  );
}
