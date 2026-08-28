"use client";

import { prettyDate } from "@/lib/clock";
import type { AuthUser } from "@/lib/session";

function fmt(value: number | undefined) {
  return Number(value || 0).toLocaleString();
}

export function UsagePanel({ user }: { user: AuthUser }) {
  const used = user.usedToday ?? 0;
  const limit = user.dailyLimit ?? 0;
  const remaining = user.remaining ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = remaining <= 0 ? "is-out" : pct >= 90 ? "is-warn" : "";
  const history = user.history || [];

  return (
    <section className={`usage-panel ${tone}`} aria-label="MC usage">
      <p className="usage-kicker">{user.planName || "Standard"} plan</p>
      <h2>Today’s MCs</h2>
      <p className="usage-date">{prettyDate(user.serverDate || user.date) || "Server date"}</p>
      <p className="usage-big">
        <strong>{fmt(used)}</strong>
        <span> / {fmt(limit)}</span>
      </p>
      <div className="usage-bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="usage-left">{fmt(remaining)} left today</p>
      <p className="hint">Counted from matched MCs shown. Changing this computer’s date does not reset the count.</p>
      {user.totalUsed != null ? <p className="usage-total">All time: {fmt(user.totalUsed)} MCs</p> : null}
      {history.length ? (
        <ol className="usage-history">
          {history.slice(0, 7).map((row) => (
            <li key={row.date}>
              <span>{row.date === (user.serverDate || user.date) ? "Today" : prettyDate(row.date)}</span>
              <strong>{fmt(row.used)}</strong>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
