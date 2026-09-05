"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthProvider";
import { LoginScreen } from "./LoginScreen";
import { SearchTool } from "./SearchTool";
import { TemplatesPage } from "./TemplatesPage";
import { GmailPage } from "./GmailPage";
import { RecentSendsPage } from "./RecentSendsPage";
import { ComposeModal } from "./ComposeModal";
import { BrandMark } from "./BrandMark";
import {
  EMAIL_GMAIL_EVENT,
  EMAIL_OPEN_EVENT,
  EMAIL_RECENT_EVENT,
  EMAIL_TEMPLATES_EVENT,
  MAIL_UI_ENABLED,
} from "@/lib/email";
import { loadDeskPage, saveDeskPage, type DeskPage } from "@/lib/searchCache";
import { fetchEmailStatus } from "@/lib/api";
import type { AuthUser } from "@/lib/session";

const PAGE_TITLES: Record<DeskPage, string> = {
  search: "Search",
  templates: "Templates",
  gmail: "Gmail",
  recent: "Recent",
};

function QuotaMeter({ user, compact = false }: { user: AuthUser; compact?: boolean }) {
  const used = user.usedToday ?? 0;
  const limit = user.dailyLimit ?? 0;
  const remaining = user.remaining ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = remaining <= 0 ? "is-out" : pct >= 90 ? "is-warn" : "";

  if (compact) {
    return (
      <p className={`quota-meter quota-meter-compact ${tone}`} title={`${remaining.toLocaleString()} MCs left today`}>
        <span className="quota-count">{used.toLocaleString()}/{limit.toLocaleString()}</span>
      </p>
    );
  }

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
  const [page, setPage] = useState<DeskPage>("search");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeKey, setComposeKey] = useState(0);
  const [mailNotice, setMailNotice] = useState<{ text: string; error: boolean } | null>(null);

  function go(next: DeskPage) {
    if (!MAIL_UI_ENABLED && next !== "search") {
      setPage("search");
      saveDeskPage("search");
      return;
    }
    setPage(next);
    saveDeskPage(next);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
    const pageParam = params.get("page");

    if (!MAIL_UI_ENABLED) {
      setPage("search");
      saveDeskPage("search");
      if (gmail || pageParam) window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const requested: DeskPage =
      gmail || pageParam === "gmail"
        ? "gmail"
        : pageParam === "templates" || pageParam === "recent" || pageParam === "search"
          ? pageParam
          : loadDeskPage();
    setPage(requested);
    saveDeskPage(requested);

    if (gmail === "ok") {
      const email = params.get("email") || "Gmail";
      window.sessionStorage.setItem("cv-gmail-just-connected", email);
      setMailNotice({ text: `Finishing Gmail connect for ${email}…`, error: false });
      void fetchEmailStatus()
        .then((status) => {
          const count = status.accountCount ?? status.accounts.length;
          if (count > 0) {
            setMailNotice({
              text:
                count === 1
                  ? `Connected ${status.account?.email || email}`
                  : `${count} Gmail accounts connected · latest ${email}`,
              error: false,
            });
          } else {
            setMailNotice({
              text:
                status.setupWarning ||
                "Google finished, but this API has 0 accounts. Check GOOGLE_OAUTH_REDIRECT_URI matches this backend.",
              error: true,
            });
          }
        })
        .catch((err) => {
          setMailNotice({
            text: err instanceof Error ? err.message : "Unable to verify Gmail connection",
            error: true,
          });
        });
    }
    if (gmail === "error") setMailNotice({ text: params.get("message") || "Gmail connect failed", error: true });
    if (gmail || pageParam) window.history.replaceState({}, "", window.location.pathname);

    function openCompose() {
      setComposeKey((value) => value + 1);
      setComposeOpen(true);
    }
    function openTemplates() {
      setComposeOpen(false);
      go("templates");
    }
    function openGmail() {
      setComposeOpen(false);
      go("gmail");
    }
    function openRecent() {
      setComposeOpen(false);
      go("recent");
    }
    window.addEventListener(EMAIL_OPEN_EVENT, openCompose);
    window.addEventListener(EMAIL_TEMPLATES_EVENT, openTemplates);
    window.addEventListener(EMAIL_GMAIL_EVENT, openGmail);
    window.addEventListener(EMAIL_RECENT_EVENT, openRecent);
    return () => {
      window.removeEventListener(EMAIL_OPEN_EVENT, openCompose);
      window.removeEventListener(EMAIL_TEMPLATES_EVENT, openTemplates);
      window.removeEventListener(EMAIL_GMAIL_EVENT, openGmail);
      window.removeEventListener(EMAIL_RECENT_EVENT, openRecent);
    };
  }, []);

  if (!ready) {
    return (
      <div className="login-page">
        <header className="app-header">
          <div className="topbar">
            <div className="brand">
              <BrandMark className="on-dark" />
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
    <div className={`app-frame${MAIL_UI_ENABLED ? "" : " is-search-only"}`}>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <aside className="app-sidebar" aria-label="Desk pages">
        <div className="sidebar-brand">
          <BrandMark className="on-dark brand-mark-sidebar" />
        </div>
        <nav className="sidebar-nav">
          <button type="button" className={page === "search" ? "is-on" : undefined} onClick={() => go("search")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Search
          </button>
          {MAIL_UI_ENABLED ? (
            <>
              <button type="button" className={page === "templates" ? "is-on" : undefined} onClick={() => go("templates")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 8l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
                Templates
              </button>
              <button type="button" className={page === "gmail" ? "is-on" : undefined} onClick={() => go("gmail")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
                Gmail
              </button>
              <button type="button" className={page === "recent" ? "is-on" : undefined} onClick={() => go("recent")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 8v4.5l3 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Recent
              </button>
            </>
          ) : null}
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
            <div className="mobile-brand">
              <BrandMark variant="icon" className="on-dark" alt="" />
              <p className="page-title">{PAGE_TITLES[page]}</p>
            </div>
            <div className="header-tools">
              <QuotaMeter user={user} />
              <QuotaMeter user={user} compact />
              <div className="mobile-session">
                <button type="button" className="ghost sign-out" onClick={() => void logout()} aria-label="Sign out">
                  Out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main id="main">
          {MAIL_UI_ENABLED && mailNotice ? (
            <p className={`banner ${mailNotice.error ? "error" : ""}`} role={mailNotice.error ? "alert" : "status"}>
              {mailNotice.text}
            </p>
          ) : null}
          <div hidden={page !== "search"}>
            <SearchTool />
          </div>
          {MAIL_UI_ENABLED && page === "templates" ? <TemplatesPage /> : null}
          {MAIL_UI_ENABLED && page === "gmail" ? <GmailPage /> : null}
          {MAIL_UI_ENABLED && page === "recent" ? <RecentSendsPage /> : null}
        </main>
      </div>

      {MAIL_UI_ENABLED && composeOpen ? (
        <ComposeModal
          key={composeKey}
          onClose={() => setComposeOpen(false)}
          onOpenTemplates={() => {
            setComposeOpen(false);
            go("templates");
          }}
          onOpenGmail={() => {
            setComposeOpen(false);
            go("gmail");
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
