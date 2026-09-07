"use client";

import { prettyDate } from "@/lib/clock";
import type { AuthUser } from "@/lib/session";

function fmt(value: number | undefined) {
  return Number(value || 0).toLocaleString();
}

export function UsagePanel({ user, compact = false }: { user: AuthUser; compact?: boolean }) {
  const used = user.usedToday ?? 0;
  const limit = user.dailyLimit ?? 0;
  const usedMonth = user.usedThisMonth ?? 0;
  const monthLimit = user.monthlyLimit ?? 0;
  const remaining = user.remaining ?? 0;
  const remainingDaily = user.remainingDaily ?? Math.max(0, limit - used);
  const remainingMonthly = user.remainingMonthly ?? Math.max(0, monthLimit - usedMonth);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const monthPct = monthLimit > 0 ? Math.min(100, Math.round((usedMonth / monthLimit) * 100)) : 0;
  const tone = remaining <= 0 ? "is-out" : pct >= 90 || monthPct >= 90 ? "is-warn" : "";
  const history = user.history || [];
  const historyLimit = compact ? 4 : 7;
  const blockedByMonth = remainingMonthly <= 0 && remainingDaily > 0;

  return (
    <section className={`usage-panel ${tone}${compact ? " is-compact" : ""}`} aria-label="MC usage">
      <p className="usage-kicker">{user.planName || "Standard"} plan</p>
      <h2>MC usage</h2>
      <p className="usage-date">{prettyDate(user.serverDate || user.date) || "Server date"}</p>

      <p className="usage-sublabel">Today</p>
      <p className="usage-big">
        <strong>{fmt(used)}</strong>
        <span> / {fmt(limit)}</span>
      </p>
      <div className="usage-bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>

      <p className="usage-sublabel">This month</p>
      <p className="usage-big usage-big-month">
        <strong>{fmt(usedMonth)}</strong>
        <span> / {fmt(monthLimit)}</span>
      </p>
      <div className="usage-bar" aria-hidden="true">
        <i style={{ width: `${monthPct}%` }} />
      </div>

      <p className="usage-left">
        {fmt(remaining)} available
        {blockedByMonth ? " (monthly cap reached)" : ` · ${fmt(remainingDaily)} day / ${fmt(remainingMonthly)} month`}
      </p>
      {compact ? null : (
        <p className="hint">
          Searches stop when either the daily or monthly cap is hit. Changing this computer’s date does not reset the
          count.
        </p>
      )}
      {user.totalUsed != null ? <p className="usage-total">All time: {fmt(user.totalUsed)} MCs</p> : null}
      {history.length ? (
        <ol className="usage-history">
          {history.slice(0, historyLimit).map((row) => (
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
