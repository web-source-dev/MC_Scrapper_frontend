"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicPlans } from "@/lib/api";
import { formatPlanLimit, mergePlanCatalog, type PlanInfo } from "@/lib/plans";
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
            start on Free; upgrades are assigned by an administrator.
            {user ? (
              <>
                {" "}
                Your current plan is <strong>{user.planName || user.plan}</strong> (
                {formatPlanLimit(user.dailyLimit, user.monthlyLimit)}).
              </>
            ) : null}
          </p>
        </div>
        <Link href="/search" className="ghost">
          Back to search
        </Link>
      </header>

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
              <p className="plan-limit">{formatPlanLimit(plan.dailyLimit, plan.monthlyLimit)}</p>
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
                <p className="plan-note">Ask an admin to set your custom day and month limits.</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
