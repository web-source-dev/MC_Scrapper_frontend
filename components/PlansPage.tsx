"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicPlans } from "@/lib/api";
import { DAT_HUB_PHONE_DISPLAY, planChangeWhatsAppUrl } from "@/lib/datHub";
import { FEATURES, featuresForUser, hasFeature, planUnlocksFeature, type FeatureId } from "@/lib/features";
import { formatPlanLimit, formatPlanMonthly, formatPlanPrice, mergePlanCatalog, type PlanInfo } from "@/lib/plans";
import { useAuth } from "./AuthProvider";

export function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanInfo[]>(mergePlanCatalog());
  const mine = featuresForUser(user);

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
          <h2>Volume and features</h2>
          <p className="hint">
            Each plan sets daily and monthly MC caps, plus which search tools you can use. New signups start on Free;
            plan changes are handled over WhatsApp.
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
        <a
          className="plans-wa-btn"
          href={planChangeWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M17.47 14.38c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.27-.72.9-.88 1.08-.16.18-.33.2-.61.07-.28-.14-1.18-.43-2.25-1.38-.83-.74-1.39-1.66-1.55-1.94-.16-.27-.02-.42.12-.56.13-.13.28-.33.42-.5.14-.16.18-.27.28-.45.09-.18.05-.34-.02-.48-.07-.14-.62-1.49-.85-2.04-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3 0 1.35.98 2.66 1.12 2.84.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.56.57.65.21 1.25.18 1.72.11.53-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32ZM12.04 2C6.5 2 2 6.48 2 12c0 1.77.46 3.45 1.27 4.9L2 22l5.24-1.37A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Z"
            />
          </svg>
          WhatsApp {DAT_HUB_PHONE_DISPLAY}
        </a>
      </section>

      <div className="plans-grid">
        {plans.map((plan) => {
          const current = String(user?.plan || "").toLowerCase() === plan.id;
          return (
            <article
              key={plan.id}
              className={`plan-card ${plan.featured ? "is-featured" : ""} ${current ? "is-current" : ""}`}
              aria-current={current ? "true" : undefined}
            >
              <div className="plan-card-top">
                <p className="plan-name">{plan.name}</p>
                {current ? <span className="plan-current-badge">Your plan</span> : null}
              </div>
              <p className="plan-price">{formatPlanPrice(plan.priceUsd)}</p>
              <p className="plan-limit">{formatPlanMonthly(plan.monthlyLimit)}</p>
              <p className="plan-blurb">{plan.blurb}</p>
              <ul className="plan-highlights">
                {plan.highlights.slice(0, 2).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <ul className="plan-features">
                {FEATURES.map((feature) => {
                  const customPick = plan.id === "custom" && !current;
                  const included =
                    plan.id === "custom" && current
                      ? hasFeature(mine, feature.id as FeatureId)
                      : plan.id !== "custom" && planUnlocksFeature(plan.id, feature.id as FeatureId);
                  return (
                    <li
                      key={feature.id}
                      className={included ? "is-on" : customPick ? "is-pick" : "is-off"}
                    >
                      <span aria-hidden="true">{included ? "✓" : customPick ? "○" : "–"}</span>
                      {feature.label}
                    </li>
                  );
                })}
              </ul>
              {plan.id === "free" && !current ? (
                <p className="plan-note">Included with every new signup.</p>
              ) : null}
              {plan.id === "custom" ? (
                <p className="plan-note">
                  {current
                    ? "Your admin chose these tools for this desk."
                    : "Message us on WhatsApp. We set volume and features for your account."}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
