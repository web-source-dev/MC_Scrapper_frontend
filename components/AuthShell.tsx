import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import { APP_NAME } from "@/lib/brand";

type Props = {
  mode: "login" | "signup";
  title: string;
  lede: string;
  kicker?: string;
  panelTitle?: string;
  children: ReactNode;
};

export function AuthShell({ mode, title, lede, kicker, panelTitle, children }: Props) {
  const switchHref = mode === "login" ? "/signup" : "/login";
  const switchLabel = mode === "login" ? "Sign up" : "Sign in";
  const switchHint = mode === "login" ? "New here?" : "Already have an account?";
  const heading = panelTitle || (mode === "login" ? "Sign in" : "Create account");
  const eyebrow = kicker || (mode === "login" ? "Welcome back" : "Get started");

  return (
    <div className="lp auth-page">
      <header className="auth-nav">
        <div className="auth-nav-inner">
          <Link href="/" className="brand" aria-label={`${APP_NAME} home`}>
            <BrandMark className="on-dark" />
          </Link>
          <nav aria-label="Account">
            <Link href="/" className="auth-nav-quiet">
              Home
            </Link>
            <Link href={switchHref} className="lp-btn lp-btn-solid auth-nav-cta">
              {switchLabel}
            </Link>
          </nav>
        </div>
      </header>

      <main className="auth-stage">
        <aside className="auth-aside">
          <div className="auth-aside-media" aria-hidden="true">
            <img src="/home-search.png" alt="" width={1440} height={900} decoding="async" />
          </div>
          <div className="auth-aside-copy">
            <p className="lp-brand">{APP_NAME}</p>
            <h1>{title}</h1>
            <p>{lede}</p>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-inner">
            <p className="lp-kicker">{eyebrow}</p>
            <h2 className="auth-panel-title">{heading}</h2>
            {children}
            <p className="auth-switch">
              {switchHint} <Link href={switchHref}>{switchLabel}</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
