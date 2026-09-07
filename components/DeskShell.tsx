"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
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
import { fetchEmailStatus } from "@/lib/api";
import { DAT_HUB_PHONE_DISPLAY, datHubWhatsAppUrl } from "@/lib/datHub";
import type { AuthUser } from "@/lib/session";

type DeskNavId = "dashboard" | "search" | "plans" | "templates" | "gmail" | "recent";

const NAV: Array<{ id: DeskNavId; href: string; label: string; mailOnly?: boolean }> = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "search", href: "/search", label: "Search" },
  { id: "plans", href: "/plans", label: "Plans" },
  { id: "templates", href: "/templates", label: "Templates", mailOnly: true },
  { id: "gmail", href: "/gmail", label: "Gmail", mailOnly: true },
  { id: "recent", href: "/recent", label: "Recent", mailOnly: true },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/search": "Search",
  "/plans": "Plans",
  "/templates": "Templates",
  "/gmail": "Gmail",
  "/recent": "Recent",
};

function QuotaMeter({ user, compact = false }: { user: AuthUser; compact?: boolean }) {
  const used = user.usedToday ?? 0;
  const limit = user.dailyLimit ?? 0;
  const usedMonth = user.usedThisMonth ?? 0;
  const monthLimit = user.monthlyLimit ?? 0;
  const remaining = user.remaining ?? 0;
  const dayPct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const monthPct = monthLimit > 0 ? Math.min(100, Math.round((usedMonth / monthLimit) * 100)) : 0;
  const tone = remaining <= 0 ? "is-out" : dayPct >= 90 || monthPct >= 90 ? "is-warn" : "";
  const title = `${user.planName || "Plan"} · ${remaining.toLocaleString()} left (day ${used.toLocaleString()}/${limit.toLocaleString()}, month ${usedMonth.toLocaleString()}/${monthLimit.toLocaleString()})`;

  if (compact) {
    return (
      <p className={`quota-meter quota-meter-compact ${tone}`} title={title}>
        <span className="quota-count">{used.toLocaleString()}/{limit.toLocaleString()}</span>
      </p>
    );
  }

  return (
    <p className={`quota-meter ${tone}`} title={title}>
      <span className="quota-plan">{user.planName || "Standard"}</span>
      <span className="quota-count">
        {used.toLocaleString()}/{limit.toLocaleString()} today · {usedMonth.toLocaleString()}/{monthLimit.toLocaleString()} mo
      </span>
    </p>
  );
}

function NavIcon({ id }: { id: DeskNavId }) {
  if (id === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5L12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "plans") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9h8M8 13h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "templates") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 8l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "gmail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DeskShell({ children }: { children: ReactNode }) {
  const { ready, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeKey, setComposeKey] = useState(0);
  const [mailNotice, setMailNotice] = useState<{ text: string; error: boolean } | null>(null);

  const visibleNav = NAV.filter((item) => !item.mailOnly || MAIL_UI_ENABLED);
  const pageTitle = PAGE_TITLES[pathname] || "Desk";

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
    }
  }, [ready, user, router, pathname]);

  useEffect(() => {
    if (!MAIL_UI_ENABLED) return;
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
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
      window.history.replaceState({}, "", pathname);
    }
    if (gmail === "error") {
      setMailNotice({ text: params.get("message") || "Gmail connect failed", error: true });
      window.history.replaceState({}, "", pathname);
    }

    function openCompose() {
      setComposeKey((value) => value + 1);
      setComposeOpen(true);
    }
    function openTemplates() {
      setComposeOpen(false);
      router.push("/templates");
    }
    function openGmail() {
      setComposeOpen(false);
      router.push("/gmail");
    }
    function openRecent() {
      setComposeOpen(false);
      router.push("/recent");
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
  }, [router, pathname]);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  if (!ready || !user) {
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

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <aside className="app-sidebar" aria-label="Desk pages">
        <div className="sidebar-brand">
          <Link href="/dashboard" aria-label="MC Scrapper dashboard">
            <BrandMark className="on-dark brand-mark-sidebar" />
          </Link>
        </div>
        <nav className="sidebar-nav">
          {visibleNav.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={pathname === item.href ? "is-on" : undefined}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <NavIcon id={item.id} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-promo">
          <a
            className="sidebar-promo-link"
            href={datHubWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Message DAT HUB on WhatsApp at ${DAT_HUB_PHONE_DISPLAY}`}
          >
            <img
              className="sidebar-promo-img"
              src="/Dat_hub_ad.png"
              alt={`DAT HUB — Get access to DAT Loadboard for truck dispatching. WhatsApp ${DAT_HUB_PHONE_DISPLAY}`}
              width={560}
              height={900}
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-header">
          <div className="topbar">
            <div className="mobile-brand">
              <BrandMark variant="icon" className="on-dark" alt="" />
              <p className="page-title">{pageTitle}</p>
            </div>
            <div className="header-tools">
              <QuotaMeter user={user} />
              <QuotaMeter user={user} compact />
              <p className="session-user header-session-user" title={user.email}>
                {user.name}
              </p>
              <button type="button" className="ghost sign-out header-sign-out" onClick={() => void onLogout()}>
                Sign out
              </button>
              <div className="mobile-session">
                <button type="button" className="ghost sign-out" onClick={() => void onLogout()} aria-label="Sign out">
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
          {children}
        </main>
      </div>

      {MAIL_UI_ENABLED && composeOpen ? (
        <ComposeModal
          key={composeKey}
          onClose={() => setComposeOpen(false)}
          onOpenTemplates={() => {
            setComposeOpen(false);
            router.push("/templates");
          }}
          onOpenGmail={() => {
            setComposeOpen(false);
            router.push("/gmail");
          }}
        />
      ) : null}
    </div>
  );
}

/** Kept for mail-only routes that still render their pages inside the desk shell. */
export function MailDeskPage({ page }: { page: "templates" | "gmail" | "recent" }) {
  if (!MAIL_UI_ENABLED) return null;
  if (page === "templates") return <TemplatesPage />;
  if (page === "gmail") return <GmailPage />;
  return <RecentSendsPage />;
}
