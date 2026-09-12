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
        <div className="plans-contact-meta">
          <a href={planChangeWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
            WhatsApp {DAT_HUB_PHONE_DISPLAY}
          </a>
        </div>
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
