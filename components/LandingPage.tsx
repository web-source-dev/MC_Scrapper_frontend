"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "./AuthProvider";
import { APP_NAME } from "@/lib/brand";
import { DAT_HUB_PHONE_DISPLAY, datHubWhatsAppUrl } from "@/lib/datHub";
import { PLAN_CATALOG, formatPlanLimit, formatPlanPrice } from "@/lib/plans";

const CHAPTERS = [
  {
    index: "01",
    title: "Search the way the desk works",
    body: "MC range, USDOT, company, city, ZIP, or phone — then filter by fleet, safety, MCS-150, and contacts.",
    src: "/home-search.png",
    alt: `${APP_NAME} search desk with filters and matched carriers`,
  },
  {
    index: "02",
    title: "Read the carrier before you dial",
    body: "Authority, phones, emails, addresses, and fleet context on one profile — copy what you need and move.",
    src: "/home-carrier.png",
    alt: "Carrier profile with identity, address, and contact details",
  },
  {
    index: "03",
    title: "Pair with DAT when you need loads",
    body: `${APP_NAME} finds authorized carriers. For loadboard access, message DAT Hub on WhatsApp.`,
    src: "/home-dat-hub.png",
    alt: "DAT Loadboard access for truck dispatching",
    href: datHubWhatsAppUrl(),
    cta: `WhatsApp ${DAT_HUB_PHONE_DISPLAY}`,
  },
];

const CAPABILITIES = [
  { title: "Five search modes", body: "MC, USDOT, company, location, phone — one desk, no tab hopping." },
  { title: "Fleet & safety filters", body: "Trucks, drivers, MCS-150, rating, cargo, hazmat, interstate, contacts." },
  { title: "Honest MC metering", body: "Daily and monthly caps, enforced server-side — clocks don’t reset usage." },
  { title: "CSV export", body: "Matched carriers out to CRM or outreach in one pass." },
];

const FAQS = [
  {
    q: "Who is this for?",
    a: "Freight dispatchers and desks that need SAFER-active, MC-authorized USA carriers without hunting across tabs.",
  },
  {
    q: "How do day and month limits work?",
    a: "Each plan has both. Remaining searches equal the lower of what’s left today and what’s left this month.",
  },
  {
    q: "What’s included free?",
    a: "New accounts start on Free: 1,000 MCs/day and 30,000/month. Upgrades are assigned by an admin.",
  },
];

function useReveal() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const items = node.querySelectorAll(".lp-reveal");
    if (!items.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return root;
}

export function LandingPage() {
  const { user, ready } = useAuth();
  const signedIn = Boolean(ready && user);
  const root = useReveal();
  const priced = PLAN_CATALOG.filter((plan) => plan.id !== "custom");
  const custom = PLAN_CATALOG.find((plan) => plan.id === "custom");

  return (
    <div className="lp" ref={root}>
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" className="brand" aria-label={`${APP_NAME} home`}>
            <BrandMark className="on-dark" />
          </Link>
          <nav aria-label="Primary">
            <a href="#product">Product</a>
            <a href="#plans">Plans</a>
            {signedIn ? (
              <Link href="/dashboard" className="lp-btn lp-btn-solid">
                Open desk
              </Link>
            ) : (
              <>
                <Link href="/login" className="lp-nav-link">
                  Sign in
                </Link>
                <Link href="/signup" className="lp-btn lp-btn-solid">
                  Start free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-media" aria-hidden="true">
          <img src="/home-search.png" alt="" width={1440} height={900} decoding="async" fetchPriority="high" />
        </div>
        <div className="lp-hero-scrim" aria-hidden="true" />
        <div className="lp-hero-content">
          <p className="lp-brand">{APP_NAME}</p>
          <h1>Authorized carriers. One desk.</h1>
          <p className="lp-lede">
            Search SAFER-active, MC-authorized USA carriers — filter, review, export.
          </p>
          <div className="lp-hero-actions">
            {signedIn ? (
              <Link href="/search" className="lp-btn lp-btn-solid">
                Go to search
              </Link>
            ) : (
              <>
                <Link href="/signup" className="lp-btn lp-btn-solid">
                  Start free
                </Link>
                <a href="#product" className="lp-btn lp-btn-ghost">
                  See the desk
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="lp-statement lp-reveal">
        <p>
          Built for dispatchers who can’t afford another dead MC — live FMCSA / SAFER signal, honest day and month
          caps, export when the list is warm.
        </p>
      </section>

      <section id="product" className="lp-chapters">
        {CHAPTERS.map((chapter) => (
          <article key={chapter.index} className="lp-chapter lp-reveal">
            <div className="lp-chapter-copy">
              <p className="lp-index">{chapter.index}</p>
              <h2>{chapter.title}</h2>
              <p>{chapter.body}</p>
              {chapter.href ? (
                <a className="lp-text-link" href={chapter.href} target="_blank" rel="noopener noreferrer">
                  {chapter.cta}
                </a>
              ) : null}
            </div>
            <div className="lp-chapter-frame">
              <img src={chapter.src} alt={chapter.alt} width={1440} height={900} loading="lazy" decoding="async" />
            </div>
          </article>
        ))}
      </section>

      <section className="lp-capabilities lp-reveal" aria-labelledby="cap-title">
        <div className="lp-capabilities-head">
          <p className="lp-kicker">Capabilities</p>
          <h2 id="cap-title">What the desk does</h2>
        </div>
        <ul className="lp-cap-list">
          {CAPABILITIES.map((item, i) => (
            <li key={item.title}>
              <span className="lp-cap-num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="plans" className="lp-plans lp-reveal">
        <div className="lp-plans-head">
          <p className="lp-kicker">Plans</p>
          <h2>Volume that matches the shift</h2>
          <p>Day and month caps on every tier. Free to start.</p>
        </div>
        <div className="lp-plan-table" role="table" aria-label="Plans">
          <div className="lp-plan-row lp-plan-head" role="row">
            <span role="columnheader">Plan</span>
            <span role="columnheader">Price</span>
            <span role="columnheader">Daily</span>
            <span role="columnheader">Monthly</span>
          </div>
          {priced.map((plan) => (
            <div key={plan.id} className={`lp-plan-row ${plan.featured ? "is-featured" : ""}`} role="row">
              <span role="cell" className="lp-plan-name">
                {plan.name}
                {plan.featured ? <em>Popular</em> : null}
              </span>
              <span role="cell">{formatPlanPrice(plan.priceUsd)}</span>
              <span role="cell">{plan.dailyLimit?.toLocaleString() ?? "—"}</span>
              <span role="cell">{plan.monthlyLimit?.toLocaleString() ?? "—"}</span>
            </div>
          ))}
        </div>
        {custom ? (
          <p className="lp-plan-custom">
            <strong>{custom.name}</strong> — {custom.blurb}
          </p>
        ) : null}
        <div className="lp-plans-cta">
          {signedIn ? (
            <Link href="/plans" className="lp-btn lp-btn-solid">
              View in desk
            </Link>
          ) : (
            <Link href="/signup" className="lp-btn lp-btn-solid">
              Create free account
            </Link>
          )}
        </div>
        <p className="lp-plan-note sr-only">
          {priced.map((p) => `${p.name}: ${formatPlanLimit(p.dailyLimit, p.monthlyLimit)}`).join(". ")}
        </p>
      </section>

      <section className="lp-faq lp-reveal" aria-labelledby="faq-title">
        <div className="lp-faq-head">
          <p className="lp-kicker">FAQ</p>
          <h2 id="faq-title">Short answers</h2>
        </div>
        <div className="lp-faq-list">
          {FAQS.map((item) => (
            <details key={item.q} className="lp-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-close lp-reveal">
        <p className="lp-brand">{APP_NAME}</p>
        <h2>Find the next carrier. Dial with confidence.</h2>
        {signedIn ? (
          <Link href="/search" className="lp-btn lp-btn-solid">
            Open search
          </Link>
        ) : (
          <Link href="/signup" className="lp-btn lp-btn-solid">
            Start free
          </Link>
        )}
      </section>

      <footer className="lp-foot">
        <div className="lp-foot-inner">
          <BrandMark className="on-dark" />
          <div className="lp-foot-links">
            <a href="#product">Product</a>
            <a href="#plans">Plans</a>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Sign up</Link>
            <a href={datHubWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
              DAT Hub
            </a>
          </div>
          <p>© {new Date().getFullYear()} {APP_NAME}</p>
        </div>
      </footer>
    </div>
  );
}
