"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { AuthShell } from "./AuthShell";
import { AuthField } from "./AuthField";
import {
  COMPANY_MAX,
  EMAIL_MAX,
  NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_RULES,
  PHONE_MAX_CHARS,
  companyError,
  confirmPasswordError,
  emailError,
  nameError,
  passwordChecks,
  passwordError,
  passwordStrength,
  phoneError,
  validateSignup,
  type FieldErrors,
} from "@/lib/credentials";

const FIELD_IDS = ["name", "company", "phone", "email", "password", "confirm"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function SignupForm() {
  const { startSignup, verifySignup, resendSignupOtp, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const checks = passwordChecks(password);
  const strength = passwordStrength(password);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  useEffect(() => {
    const resumeEmail = params.get("email")?.trim() || "";
    if (!resumeEmail) return;
    setEmail(resumeEmail);
    if (params.get("verify") === "1") {
      setStep("otp");
      setFormError("Enter the code from your email, or resend a new one.");
    }
  }, [params]);

  useEffect(() => {
    if (step !== "otp") return;
    document.getElementById("signup-otp")?.focus();
  }, [step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  function clearField(field: keyof FieldErrors) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function focusFirst(next: FieldErrors) {
    const field = FIELD_IDS.find((id) => next[id]);
    if (field) document.getElementById(`signup-${field}`)?.focus();
  }

  function attachApiErrors(err: unknown) {
    const payload = isRecord(err) ? err : {};
    const code = typeof payload.code === "string" ? payload.code : "";
    const fieldErrors =
      isRecord(payload.errors) &&
      Object.fromEntries(
        Object.entries(payload.errors).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      );
    if (code === "EMAIL_TAKEN") {
      const next: FieldErrors = { email: "That email is already in use" };
      setErrors(next);
      setFormError(null);
      setStep("form");
      focusFirst(next);
      return;
    }
    if (code === "EMAIL_VERIFIED") {
      setFormError(err instanceof Error ? err.message : "This account is already verified. Sign in instead.");
      setStep("form");
      return;
    }
    if (code === "OTP_COOLDOWN") {
      const wait = typeof payload.resendIn === "number" ? payload.resendIn : 45;
      setResendIn(wait);
      setFormError(err instanceof Error ? err.message : "Wait before requesting another code");
      setStep("otp");
      return;
    }
    if (code === "OTP_INVALID" || code === "OTP_EXPIRED" || code === "OTP_LOCKED" || code === "OTP_MISSING") {
      setErrors({ otp: err instanceof Error ? err.message : "That code is wrong or has expired" });
      setFormError(null);
      setStep("otp");
      return;
    }
    const field = typeof payload.field === "string" ? payload.field : "";
    if (field && err instanceof Error) {
      const next = { [field]: err.message } as FieldErrors;
      setErrors(next);
      setFormError(field === "otp" ? null : "Fix the highlighted fields, then try again.");
      if (field === "otp") setStep("otp");
      else {
        setStep("form");
        focusFirst(next);
      }
      return;
    }
    if (fieldErrors && Object.keys(fieldErrors).length) {
      setErrors(fieldErrors as FieldErrors);
      setFormError("Fix the highlighted fields, then try again.");
      if (fieldErrors.otp) setStep("otp");
      else {
        setStep("form");
        focusFirst(fieldErrors as FieldErrors);
      }
      return;
    }
    setFormError(err instanceof Error ? err.message : "Unable to create account");
  }

  async function onSubmitForm(event: FormEvent) {
    event.preventDefault();
    const checked = validateSignup({ name, company, phone, email, password, confirmPassword });
    if (!checked.ok) {
      setErrors(checked.errors);
      setFormError("Fix the highlighted fields, then try again.");
      focusFirst(checked.errors);
      return;
    }
    setBusy(true);
    setFormError(null);
    setErrors({});
    try {
      const result = await startSignup(checked.values);
      setEmail(result.email);
      setResendIn(result.resendIn || 45);
      setOtp("");
      setStep("otp");
    } catch (err) {
      attachApiErrors(err);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitOtp(event: FormEvent) {
    event.preventDefault();
    const code = otp.replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      setErrors({ otp: "Enter the 6-digit code from your email" });
      return;
    }
    setBusy(true);
    setFormError(null);
    setErrors({});
    try {
      await verifySignup(email, code);
      router.replace("/dashboard");
    } catch (err) {
      attachApiErrors(err);
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (resendIn > 0 || busy) return;
    setBusy(true);
    setFormError(null);
    setErrors({});
    try {
      const result = await resendSignupOtp(email);
      setResendIn(result.resendIn || 45);
    } catch (err) {
      attachApiErrors(err);
    } finally {
      setBusy(false);
    }
  }

  if (step === "otp") {
    return (
      <AuthShell
        mode="signup"
        kicker="Almost there"
        panelTitle="Verify email"
        title="Check your inbox."
        lede={`We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
      >
        <form className="auth-form" onSubmit={onSubmitOtp} noValidate>
          {formError ? (
            <p className="auth-banner" role="alert">
              {formError}
            </p>
          ) : (
            <p className="auth-hint">Temporary inboxes won’t receive this code.</p>
          )}
          <div className="auth-otp-field">
            <AuthField
              id="signup-otp"
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                clearField("otp");
              }}
              error={errors.otp}
              required
              maxLength={6}
              spellCheck={false}
            />
          </div>
          <button type="submit" className="lp-btn lp-btn-solid auth-submit" disabled={busy}>
            {busy ? "Verifying…" : "Verify and continue"}
          </button>
          <div className="auth-otp-actions">
            <button type="button" className="auth-text-btn" onClick={onResend} disabled={busy || resendIn > 0}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <button
              type="button"
              className="auth-text-btn"
              onClick={() => {
                setStep("form");
                setOtp("");
                setErrors({});
                setFormError(null);
              }}
              disabled={busy}
            >
              Use a different email
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      mode="signup"
      title="Start on Free."
      lede="1,000 MCs a day and 30,000 a month — then search, filter, and export from one dispatcher desk."
    >
      <form className="auth-form" onSubmit={onSubmitForm} noValidate>
        <p className="auth-hint">No card required. We’ll email a code to confirm the address.</p>
        {formError ? (
          <p className="auth-banner" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="auth-field-row">
          <AuthField
            id="signup-name"
            label="Full name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearField("name");
            }}
            onBlur={() => {
              if (!name.trim()) return;
              const message = nameError(name);
              if (message) setErrors((current) => ({ ...current, name: message }));
            }}
            error={errors.name}
            required
            autoFocus
            maxLength={NAME_MAX}
            spellCheck={false}
          />
          <AuthField
            id="signup-company"
            label="Company"
            type="text"
            autoComplete="organization"
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              clearField("company");
            }}
            onBlur={() => {
              if (!company.trim()) return;
              const message = companyError(company);
              if (message) setErrors((current) => ({ ...current, company: message }));
            }}
            error={errors.company}
            required
            placeholder="Brokerage or desk"
            maxLength={COMPANY_MAX}
          />
        </div>

        <AuthField
          id="signup-phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            clearField("phone");
          }}
          onBlur={() => {
            if (!phone.trim()) return;
            const message = phoneError(phone);
            if (message) setErrors((current) => ({ ...current, phone: message }));
          }}
          error={errors.phone}
          hint="Include country code, like +1 or +92"
          required
          placeholder="+1 415 123 4567"
          maxLength={PHONE_MAX_CHARS}
        />

        <AuthField
          id="signup-email"
          label="Work email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearField("email");
          }}
          onBlur={() => {
            if (!email.trim()) return;
            const message = emailError(email);
            if (message) setErrors((current) => ({ ...current, email: message }));
          }}
          error={errors.email}
          hint="We’ll send a verification code — not a temporary inbox"
          required
          maxLength={EMAIL_MAX}
          spellCheck={false}
        />

        <div className="auth-field-row">
          <AuthField
            id="signup-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearField("password");
              setShowRules(true);
            }}
            onFocus={() => setShowRules(true)}
            onBlur={() => {
              if (!password) return;
              const message = passwordError(password, { email, name, company });
              if (message) setErrors((current) => ({ ...current, password: message }));
            }}
            error={errors.password}
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
          />
          <AuthField
            id="signup-confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearField("confirm");
            }}
            onBlur={() => {
              if (!confirmPassword) return;
              const message = confirmPasswordError(password, confirmPassword);
              if (message) setErrors((current) => ({ ...current, confirm: message }));
            }}
            error={errors.confirm}
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
          />
        </div>

        {showRules || password ? (
          <div className="auth-password-meta">
            <div
              className={`auth-strength is-${strength.label.toLowerCase()}`}
              aria-label={`Password strength: ${strength.label}`}
            >
              <span className="auth-strength-label">Strength: {strength.label}</span>
              <span className="auth-strength-track" aria-hidden="true">
                <span style={{ width: `${(strength.score / 5) * 100}%` }} />
              </span>
            </div>
            <ul className="auth-checks">
              {PASSWORD_RULES.map((rule) => (
                <li key={rule.key} className={checks[rule.key] ? "is-met" : undefined}>
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button type="submit" className="lp-btn lp-btn-solid auth-submit" disabled={busy}>
          {busy ? "Sending code…" : "Send verification code"}
        </button>
      </form>
    </AuthShell>
  );
}

export function SignupScreen() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
