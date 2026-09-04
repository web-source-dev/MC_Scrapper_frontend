"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchMeta, verifyCarriers } from "@/lib/api";
import { clockProblem } from "@/lib/clock";
import {
  clearSearchSession,
  loadSearchForm,
  loadSearchSession,
  memorySearchSession,
  saveSearchForm,
  saveSearchSession,
} from "@/lib/searchCache";
import { useAuth } from "./AuthProvider";
import { ClockBlock } from "./ClockBlock";
import { UsagePanel } from "./UsagePanel";
import {
  DEFAULT_FORM,
  type Carrier,
  type MetaResponse,
  type SearchFormState,
  type VerifyResponse,
} from "@/lib/types";
import { ResultsTable } from "./ResultsTable";
import { SearchForm } from "./SearchForm";

const FALLBACK_META: MetaResponse = {
  searchModes: [
    { id: "mc-range", label: "MC Range", description: "" },
    { id: "mc-lookup", label: "Single MC / DOT", description: "" },
    { id: "id-list", label: "MC / DOT list", description: "" },
    { id: "company-name", label: "Company name", description: "" },
    { id: "location", label: "State & city", description: "" },
    { id: "phone", label: "Phone number", description: "" },
  ],
  equipmentTypes: [
    { id: "van", label: "Dry Van" },
    { id: "reefer", label: "Reefer" },
    { id: "flatbed", label: "Flatbed" },
    { id: "stepdeck", label: "Step Deck" },
    { id: "poweronly", label: "Power Only" },
    { id: "hopper", label: "Hopper Bottom" },
    { id: "tanker", label: "Tanker" },
    { id: "intermodal", label: "Intermodal / Container" },
    { id: "auto", label: "Auto Carrier" },
    { id: "livestock", label: "Livestock" },
    { id: "logging", label: "Logging / Poles" },
    { id: "dump", label: "Dump" },
    { id: "oilfield", label: "Oilfield" },
    { id: "household", label: "Household Goods" },
    { id: "hazmat", label: "Hazmat / Chemicals" },
  ],
  safetyRatings: [
    { id: "any", label: "Any safety rating" },
    { id: "usable", label: "Satisfactory or not rated" },
    { id: "S", label: "Satisfactory" },
    { id: "C", label: "Conditional" },
    { id: "U", label: "Unsatisfactory" },
    { id: "none", label: "Not rated" },
  ],
  states: [],
  limits: { maxMcRange: 10000, maxList: 250, maxResults: 10000 },
};

type RecentSearch = {
  id: string;
  label: string;
  form: SearchFormState;
};

function describeSearch(form: SearchFormState) {
  if (form.searchMode === "mc-range") return `MC ${form.startMc}–${form.endMc}`;
  if (form.searchMode === "mc-lookup") {
    return `${form.identifierType === "dot" ? "DOT" : "MC"} ${form.identifier}`;
  }
  if (form.searchMode === "id-list") return "Pasted ID list";
  if (form.searchMode === "company-name") return form.companyName;
  if (form.searchMode === "location") {
    return [form.city, form.state].filter(Boolean).join(", ");
  }
  return form.phone;
}

export function SearchTool() {
  const { user, applyUsage } = useAuth();
  const cached = memorySearchSession();
  const [tick, setTick] = useState(0);
  const [meta, setMeta] = useState<MetaResponse>(FALLBACK_META);
  const [form, setForm] = useState<SearchFormState>(cached?.form || DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(Boolean(cached));
  const [error, setError] = useState<string | null>(null);
  const [carriers, setCarriers] = useState<Carrier[] | null>(cached?.carriers ?? null);
  const [result, setResult] = useState<VerifyResponse["meta"] | null>(cached?.result ?? null);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const remaining = user?.remaining;
  const clock = clockProblem(
    {
      serverNow: user?.serverNow,
      serverDate: user?.serverDate,
      timezone: user?.timezone,
    },
    Date.now() + tick * 0,
  );
  const clockBlocked = Boolean(clock);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch(() => setMeta(FALLBACK_META));
    try {
      const stored = window.localStorage.getItem("mc-verifier-recents");
      if (stored) setRecents(JSON.parse(stored) as RecentSearch[]);
    } catch {
      setRecents([]);
    }
    const localForm = loadSearchForm();
    if (localForm && !cached) setForm(localForm);
    loadSearchSession()
      .then((saved) => {
        if (saved?.carriers) {
          setForm(saved.form || localForm || DEFAULT_FORM);
          setCarriers(saved.carriers);
          setResult(saved.result || null);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    saveSearchForm(form);
  }, [form]);

  function patchForm(patch: Partial<SearchFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function remember(nextForm: SearchFormState) {
    const entry = {
      id: `${Date.now()}`,
      label: describeSearch(nextForm),
      form: nextForm,
    };
    const next = [entry, ...recents.filter((item) => item.label !== entry.label)].slice(0, 6);
    setRecents(next);
    window.localStorage.setItem("mc-verifier-recents", JSON.stringify(next));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (clockBlocked) return;
    setLoading(true);
    setError(null);

    try {
      const payload = await verifyCarriers(form);
      const nextCarriers = payload.carriers || [];
      const nextResult = payload.meta || null;
      setCarriers(nextCarriers);
      setResult(nextResult);
      await saveSearchSession({ form, carriers: nextCarriers, result: nextResult });
      if (payload.usage) {
        applyUsage(payload.usage);
      }
      remember(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify carriers");
    } finally {
      setLoading(false);
    }
  }

  async function clearResults() {
    setCarriers(null);
    setResult(null);
    setError(null);
    await clearSearchSession();
  }

  const summaryLabel = useMemo(() => {
    if (!result) return "";
    if (result.scannedRange) {
      return `${result.scannedRange.startMc}–${result.scannedRange.endMc}`;
    }
    return describeSearch(form);
  }, [form, result]);

  return (
    <div className="workspace">
      <div className="workspace-main">
        <SearchForm
          meta={meta}
          form={form}
          loading={loading}
          remaining={remaining}
          clockBlocked={clockBlocked}
          onChange={patchForm}
          onSubmit={onSubmit}
        />

        <div className="workspace-results">
          {clock ? (
            <ClockBlock message={clock.message} serverDate={clock.serverDate} deviceDate={clock.deviceDate} />
          ) : null}

          {error ? (
            <div className="banner error" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="banner banner-compact" role="status">
              <span className="banner-text-full">Searching… current results stay until this finishes or you clear.</span>
              <span className="banner-text-short">Searching…</span>
            </p>
          ) : null}

          {carriers ? (
            <>
              <div className="results-meta-row">
                <p className="results-meta">
                  <strong>{result?.returned ?? carriers.length}</strong> matched
                  {summaryLabel ? <span className="results-meta-detail"> · {summaryLabel}</span> : null}
                  {result?.summary.withPhone != null ? (
                    <span className="results-meta-detail"> · {result.summary.withPhone} w/ phone</span>
                  ) : null}
                  {result?.quotaCapped ? <span className="results-meta-detail"> · capped</span> : null}
                </p>
                <button type="button" className="ghost results-clear" onClick={() => void clearResults()}>
                  Clear
                </button>
              </div>
              <ResultsTable carriers={carriers} truncated={result?.truncated} onClear={() => void clearResults()} />
            </>
          ) : null}

          {hydrated && !loading && !carriers && !error && !clock ? (
            <div className="empty intro">
              <h2>Search a carrier</h2>
              <p>Enter an MC range, USDOT, name, location, or phone, then search. Results stay until you hit Clear.</p>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="rail" aria-label="Usage and recent searches">
        <details className="rail-drawer">
          <summary>Usage &amp; recent</summary>
          <div className="rail-drawer-body">
            {user ? <UsagePanel user={user} /> : null}
            {recents.length ? (
              <div className="recents">
                <p>Recent</p>
                {recents.map((item) => (
                  <button key={item.id} type="button" className="recent-link" onClick={() => setForm(item.form)}>
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </details>
        <div className="rail-desktop">
          {user ? <UsagePanel user={user} /> : null}
          {recents.length ? (
            <div className="recents">
              <p>Recent</p>
              {recents.map((item) => (
                <button key={item.id} type="button" className="recent-link" onClick={() => setForm(item.form)}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
