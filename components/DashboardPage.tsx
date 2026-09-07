"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { UsagePanel } from "./UsagePanel";

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const remaining = user.remaining ?? 0;

  return (
    <div className="desk-home">
      <section className="desk-home-hero">
        <div>
          <p className="mail-eyebrow">Dashboard</p>
          <h2>Welcome back, {user.name.split(" ")[0] || user.name}</h2>
          <p className="hint">
            You are on <strong>{user.planName || "Free"}</strong> with{" "}
            <strong>{remaining.toLocaleString()}</strong> MCs available (whichever is lower of today’s and this month’s
            remaining).
          </p>
          <div className="desk-home-actions">
            <Link href="/search" className="primary">
              Open search
            </Link>
            <Link href="/plans" className="ghost">
              View plans
            </Link>
          </div>
        </div>
        <UsagePanel user={user} />
      </section>

      <section className="desk-home-grid" aria-label="Quick links">
        <article className="desk-home-card">
          <h3>Search carriers</h3>
          <p>MC range, USDOT, company name, location, or phone — with fleet and safety filters.</p>
          <Link href="/search">Go to search →</Link>
        </article>
        <article className="desk-home-card">
          <h3>Daily plans</h3>
          <p>Free 1,000/day, Standard, Plus, Premium, or Custom limits for bigger desks.</p>
          <Link href="/plans">Compare plans →</Link>
        </article>
        <article className="desk-home-card">
          <h3>Export ready</h3>
          <p>Copy phones and emails or export CSV from any search result set.</p>
          <Link href="/search">Start a search →</Link>
        </article>
      </section>
    </div>
  );
}
