"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthProvider";
import { LoginScreen } from "./LoginScreen";
import { SearchTool } from "./SearchTool";
import { TemplatesPage } from "./TemplatesPage";
import { ComposeModal } from "./ComposeModal";
import { SourceStatus } from "./SourceStatus";
import { EMAIL_OPEN_EVENT, EMAIL_TEMPLATES_EVENT } from "@/lib/email";
import { loadDeskPage, saveDeskPage } from "@/lib/searchCache";
import type { AuthUser } from "@/lib/session";

function QuotaMeter({ user }: { user: AuthUser }) {
  const used = user.usedToday ?? 0;
  const limit = user.dailyLimit ?? 0;
  const remaining = user.remaining ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = remaining <= 0 ? "is-out" : pct >= 90 ? "is-warn" : "";

  return (
    <p className={`quota-meter ${tone}`} title={`${user.planName || "Plan"} · ${remaining.toLocaleString()} MCs left today`}>
      <span className="quota-plan">{user.planName || "Standard"}</span>
      <span className="quota-count">
        {used.toLocaleString()} / {limit.toLocaleString()} MCs today
      </span>
    </p>
  );
}

function Desk() {
  const { ready, user, logout } = useAuth();
  const [page, setPage] = useState<"search" | "templates">("search");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeKey, setComposeKey] = useState(0);
  const [mailNotice, setMailNotice] = useState<{ text: string; error: boolean } | null>(null);

  function go(next: "search" | "templates") {
    setPage(next);
    saveDeskPage(next);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
    const requested = params.get("page") === "templates" || gmail ? "templates" : loadDeskPage();
    setPage(requested);
    saveDeskPage(requested);
    if (gmail === "ok") setMailNotice({ text: `Connected ${params.get("email") || "Gmail"}`, error: false });
    if (gmail === "error") setMailNotice({ text: params.get("message") || "Gmail connect failed", error: true });
    if (gmail || params.get("page")) window.history.replaceState({}, "", window.location.pathname);

    function openCompose() {
      setComposeKey((value) => value + 1);
      setComposeOpen(true);
    }
    function openTemplates() {
      setComposeOpen(false);
      go("templates");
    }
    window.addEventListener(EMAIL_OPEN_EVENT, openCompose);
    window.addEventListener(EMAIL_TEMPLATES_EVENT, openTemplates);
    return () => {
      window.removeEventListener(EMAIL_OPEN_EVENT, openCompose);
      window.removeEventListener(EMAIL_TEMPLATES_EVENT, openTemplates);
    };
  }, []);

  if (!ready) {
    return (
      <div className="login-page">
        <header className="app-header">
          <div className="topbar">
            <div className="brand">
              <span className="mark" aria-hidden="true">
                MC
              </span>
              <h1>Carrier Verifier</h1>
            </div>
          </div>
        </header>
        <main className="login-main">
          <p className="hint">Checking session…</p>
        </main>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <aside className="app-sidebar" aria-label="Desk pages">
        <div className="sidebar-brand">
          <span className="mark" aria-hidden="true">
            MC
          </span>
          <div>
            <p className="eyebrow">Dispatcher</p>
            <h1>Carrier Verifier</h1>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button type="button" className={page === "search" ? "is-on" : undefined} onClick={() => go("search")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Search
          </button>
          <button type="button" className={page === "templates" ? "is-on" : undefined} onClick={() => go("templates")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 8l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            Templates
          </button>
        </nav>
        <div className="sidebar-foot">
          <p className="session-user" title={user.email}>
            {user.name}
          </p>
          <button type="button" className="ghost sign-out" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-header">
          <div className="topbar">
            <p className="page-title">{page === "templates" ? "Templates" : "Search"}</p>
            <div className="header-tools">
              <SourceStatus />
              <QuotaMeter user={user} />
            </div>
          </div>
        </header>
        <main id="main">
          {mailNotice ? (
            <p className={`banner ${mailNotice.error ? "error" : ""}`} role={mailNotice.error ? "alert" : "status"}>
              {mailNotice.text}
            </p>
          ) : null}
          <div hidden={page !== "search"}>
            <SearchTool />
          </div>
          {page === "templates" ? <TemplatesPage /> : null}
        </main>
      </div>

      {composeOpen ? (
        <ComposeModal
          key={composeKey}
          onClose={() => setComposeOpen(false)}
          onOpenTemplates={() => {
            setComposeOpen(false);
            go("templates");
          }}
        />
      ) : null}
    </div>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
      <Desk />
    </AuthProvider>
  );
}
