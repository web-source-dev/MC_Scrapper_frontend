import type { InputHTMLAttributes, ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function AuthField({ id, label, error, hint, ...input }: Props) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, !error && hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`auth-field ${error ? "is-invalid" : ""}`}>
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && !error ? (
        <p id={hintId} className="auth-field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="auth-field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
