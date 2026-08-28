"use client";

import { useState, type MouseEvent } from "react";

type Props = {
  value?: string | number | null;
  label: string;
  href?: string;
  compact?: boolean;
};

export function CopyValue({ value, label, href, compact }: Props) {
  const [copied, setCopied] = useState(false);
  const text = value == null ? "" : String(value).trim();

  if (!text) return <span className="muted-dash">—</span>;

  async function copy(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <span className={`copy-value ${compact ? "is-compact" : ""}`}>
      {href ? (
        <a href={href} onClick={(event) => event.stopPropagation()}>
          {text}
        </a>
      ) : (
        <span className="copy-text">{text}</span>
      )}
      <button
        type="button"
        className="copy-btn"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        title={copied ? "Copied" : `Copy ${label}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
