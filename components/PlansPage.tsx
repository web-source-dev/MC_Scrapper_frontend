"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicPlans } from "@/lib/api";
import { DAT_HUB_PHONE_DISPLAY, planChangeWhatsAppUrl } from "@/lib/datHub";
import { formatPlanLimit, formatPlanMonthly, mergePlanCatalog, type PlanInfo } from "@/lib/plans";
import { useAuth } from "./AuthProvider";

export function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanInfo[]>(mergePlanCatalog());

  useEffect(() => {
    void fetchPublicPlans()
      .then((apiPlans) => setPlans(mergePlanCatalog(apiPlans)))
      .catch(() => setPlans(mergePlanCatalog()));
  }, []);

  return (
    <div className="plans-page">
      <header className="plans-page-head">
        <div>
          <p className="mail-eyebrow">Plans</p>
          <h2>Daily and monthly MC volume</h2>
          <p className="hint">
            Each plan has both a daily and a monthly MC cap. Searching stops when either limit is reached. New signups
            start on Free; plan changes are handled manually over WhatsApp.
            {user ? (
              <>
                {" "}
                Your current plan is <strong>{user.planName || user.plan}</strong> (
                {formatPlanLimit(user.dailyLimit, user.monthlyLimit)}).
              </>
            ) : null}
          </p>
        </div>
        <div className="plans-page-actions">
          <a
            className="primary plans-change-btn"
            href={planChangeWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Change plan
          </a>
          <Link href="/search" className="ghost">
            Back to search
          </Link>
        </div>
      </header>

      <section className="plans-contact" aria-label="Plan change contact">
        <div>
          <p className="plans-contact-kicker">Need a different plan?</p>
          <h3>Contact us on WhatsApp</h3>
        </div>
        <div className="plans-contact-meta">
          <a href={planChangeWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
            WhatsApp {DAT_HUB_PHONE_DISPLAY}
          </a>
        </div>
      </section>

      <div className="plans-grid">
        {plans.map((plan) => {
          const current = user?.plan === plan.id;
          return (
            <article
              key={plan.id}
              className={`plan-card ${plan.featured ? "is-featured" : ""} ${current ? "is-current" : ""}`}
            >
              <div className="plan-card-top">
                <p className="plan-name">{plan.name}</p>
                {current ? <span className="mail-badge">Current</span> : null}
              </div>
              <p className="plan-limit">{formatPlanMonthly(plan.monthlyLimit)}</p>
              <p className="plan-blurb">{plan.blurb}</p>
              <ul>
                {plan.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {plan.id === "free" && !current ? (
                <p className="plan-note">Included with every new signup.</p>
              ) : null}
              {plan.id === "custom" ? (
                <p className="plan-note">Message us on WhatsApp to set custom day and month limits.</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
