"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { fetchNewDots, fetchNewDotsStates, setDotReached, type NewDotCarrier, type NewDotsFilters } from "@/lib/api";
import type { StateOption } from "@/lib/types";
import { CarrierProfile } from "./CarrierProfile";
import { DatHubPromoModal } from "./DatHubPromoModal";

const PAGE_SIZE = 100;
const COLUMNS = 10;

const INITIAL_FILTERS: NewDotsFilters = { equipment: "", reached: "all", state: "", q: "" };

type ListQuery = NewDotsFilters & { page: number };

/** "20261023" → "Oct 23, 2026" */
function formatDay(value?: string | null) {
  if (!value || value.length !== 8) return "";
  const date = new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function NewDotsPage() {
  const [query, setQuery] = useState<ListQuery>({ ...INITIAL_FILTERS, page: 1 });
  const [searchText, setSearchText] = useState("");
  const [pageInput, setPageInput] = useState("1");
  const [carriers, setCarriers] = useState<NewDotCarrier[]>([]);
  const [total, setTotal] = useState(0);
  const [reachedCount, setReachedCount] = useState(0);
  const [listWindow, setListWindow] = useState<{ from: string; to: string } | null>(null);
  const [states, setStates] = useState<StateOption[]>([]);
  const [loadedQuery, setLoadedQuery] = useState<ListQuery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  // Shown on every load of this page.
  const [promoOpen, setPromoOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  /** Total for the current filters, so page changes can skip the count query. */
  const knownTotal = useRef<{ key: string; total: number } | null>(null);

  useEffect(() => {
    void fetchNewDotsStates()
      .then((result) => setStates(result.states))
      .catch(() => null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const key = JSON.stringify({ ...query, page: 0 });
    const cached = knownTotal.current?.key === key ? knownTotal.current.total : null;
    fetchNewDots(
      {
        equipment: query.equipment,
        reached: query.reached,
        state: query.state,
        q: query.q,
        offset: (query.page - 1) * PAGE_SIZE,
        pageSize: PAGE_SIZE,
        withCount: cached == null,
      },
      controller.signal,
    )
      .then((result) => {
        const nextTotal = result.total ?? cached ?? 0;
        knownTotal.current = { key, total: nextTotal };
        setCarriers(result.carriers);
        setTotal(nextTotal);
        setReachedCount(result.reachedCount);
        setListWindow(result.window);
        setError(null);
        setLoadedQuery(query);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load carriers");
        setLoadedQuery(query);
      });
    return () => controller.abort();
  }, [query]);

  function goTo(next: Partial<ListQuery>) {
    const merged = { ...query, ...next };
    setExpanded(null);
    setPageInput(String(merged.page));
    setQuery(merged);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function update(next: Partial<NewDotsFilters>) {
    goTo({ ...next, page: 1 });
  }

  async function toggleReached(carrier: NewDotCarrier) {
    if (!carrier.dotNumber) return;
    const next = !carrier.reached;
    setSaving((current) => ({ ...current, [carrier.id]: true }));
    setCarriers((rows) => rows.map((row) => (row.id === carrier.id ? { ...row, reached: next } : row)));
    try {
      const result = await setDotReached(carrier.dotNumber, next);
      setReachedCount(result.reachedCount);
      // Reached / Not reached counts are stale once the shared list changes.
      if (query.reached !== "all") knownTotal.current = null;
    } catch (err) {
      setCarriers((rows) => rows.map((row) => (row.id === carrier.id ? { ...row, reached: !next } : row)));
      setError(err instanceof Error ? err.message : "Unable to save reached status");
    } finally {
      setSaving((current) => ({ ...current, [carrier.id]: false }));
    }
  }

  const loading = loadedQuery !== query;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total ? (query.page - 1) * PAGE_SIZE + 1 : 0;
  const lastRow = Math.min(query.page * PAGE_SIZE, total);

  function jumpToPage() {
    const wanted = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(wanted)) {
      setPageInput(String(query.page));
      return;
    }
    const target = Math.min(pageCount, Math.max(1, wanted));
    if (target === query.page) {
      setPageInput(String(target));
      return;
    }
    goTo({ page: target });
  }

  return (
    <div className="nd-standalone">
      <main className="nd-main">
        <div className="mail-studio nd-page">
          <header className="mail-studio-top">
            <div className="mail-studio-title">
              <p className="mail-lede">
                Active Dry Van, Reefer and Flatbed carriers with active MC authority, registered or updated
                {listWindow
                  ? ` from ${formatDay(listWindow.from)} to ${formatDay(listWindow.to)}`
                  : " in a fixed 6-month window"}
                , newest first. This list is fixed and does not change day to day. Tick Reached once a carrier has
                been contacted — ticks are shared with everyone using this page.
              </p>
            </div>
            <div className="mail-studio-metrics">
              <div className="mail-metric">
                <span>Matches</span>
                <strong>{loading && !total ? "…" : total.toLocaleString()}</strong>
              </div>
              <div className="mail-metric">
                <span>Reached</span>
                <strong>{reachedCount.toLocaleString()}</strong>
              </div>
              <div className="mail-metric">
                <span>Page</span>
                <strong>
                  {query.page.toLocaleString()} / {pageCount.toLocaleString()}
                </strong>
              </div>
            </div>
          </header>

          {error ? (
            <p className="banner error" role="alert">
              {error}
            </p>
          ) : null}

          <section className="results" aria-busy={loading}>
            <div className="results-toolbar">
              <form
                className="search-inline"
                onSubmit={(event) => {
                  event.preventDefault();
                  update({ q: searchText.trim() });
                }}
              >
                <label>
                  <span className="sr-only">Search carriers</span>
                  <input
                    type="search"
                    placeholder="Search name, city, USDOT, MC or phone — press Enter"
                    value={searchText}
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      if (!event.target.value && query.q) update({ q: "" });
                    }}
                  />
                </label>
              </form>
              <div className="toolbar-actions">
                <label className="copy-select">
                  <span className="sr-only">Equipment</span>
                  <select
                    value={query.equipment}
                    onChange={(event) => update({ equipment: event.target.value as NewDotsFilters["equipment"] })}
                  >
                    <option value="">All equipment</option>
                    <option value="van">Dry Van</option>
                    <option value="reefer">Reefer</option>
                    <option value="flatbed">Flatbed</option>
                  </select>
                </label>
                <label className="copy-select">
                  <span className="sr-only">Reached status</span>
                  <select
                    value={query.reached}
                    onChange={(event) => update({ reached: event.target.value as NewDotsFilters["reached"] })}
                  >
                    <option value="all">All carriers</option>
                    <option value="unreached">Not reached</option>
                    <option value="reached">Reached</option>
                  </select>
                </label>
                <label className="copy-select">
                  <span className="sr-only">State</span>
                  <select value={query.state} onChange={(event) => update({ state: event.target.value })}>
                    <option value="">All states</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.code} · {state.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className={`table-wrap nd-scroll${loading ? " is-loading" : ""}`} ref={scrollRef}>
              <table className="nd-table">
                <colgroup>
                  <col style={{ width: 76 }} />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 128 }} />
                  <col style={{ width: 260 }} />
                  <col style={{ width: 170 }} />
                  <col style={{ width: 132 }} />
                  <col style={{ width: 230 }} />
                  <col style={{ width: 70 }} />
                  <col style={{ width: 104 }} />
                  <col style={{ width: 104 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Reached</th>
                    <th>USDOT</th>
                    <th>MC</th>
                    <th>Carrier</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Trucks</th>
                    <th>Added</th>
                    <th>MCS-150</th>
                  </tr>
                </thead>
                <tbody>
                  {carriers.map((carrier) => (
                    <Fragment key={carrier.id}>
                      <tr
                        className={`nd-row${expanded === carrier.id ? " is-open" : ""}${carrier.reached ? " is-reached" : ""}`}
                        onClick={() => setExpanded((current) => (current === carrier.id ? null : carrier.id))}
                      >
                        <td onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={carrier.reached}
                            disabled={Boolean(saving[carrier.id])}
                            onChange={() => void toggleReached(carrier)}
                            aria-label={`Mark USDOT ${carrier.dotNumber} as reached`}
                          />
                        </td>
                        <td className="mono">{carrier.dotNumber || "—"}</td>
                        <td className={carrier.mcDisplay ? "mono" : "nd-sub"}>
                          {carrier.mcDisplay || "No MC available"}
                        </td>
                        <td title={[carrier.legalName, carrier.dbaName].filter(Boolean).join(" · ")}>
                          <strong className="nd-line">{carrier.legalName || "Unnamed carrier"}</strong>
                          {carrier.dbaName ? <span className="nd-line nd-sub">{carrier.dbaName}</span> : null}
                        </td>
                        <td>{carrier.location || "—"}</td>
                        <td>{carrier.phone || carrier.cellPhone || "—"}</td>
                        <td title={carrier.email || undefined}>{carrier.email || "—"}</td>
                        <td className="mono">{carrier.trucks}</td>
                        <td className="mono">{carrier.addedDate || "—"}</td>
                        <td className="mono">{carrier.mcs150Date || "—"}</td>
                      </tr>
                      {expanded === carrier.id ? (
                        <tr className="detail-row">
                          <td colSpan={COLUMNS}>
                            <CarrierProfile carrier={carrier} snapshot={null} leadView />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                  {!carriers.length ? (
                    <tr className="nd-spacer nd-status">
                      <td colSpan={COLUMNS}>
                        {loading ? "Loading carriers…" : "No matching carriers. Clear the search or change the filters."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="table-footer nd-footer">
              <p className="table-note">
                {loading
                  ? "Loading…"
                  : `Showing ${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${total.toLocaleString()}`}
              </p>
              <div className="pager">
                <button
                  type="button"
                  className="ghost"
                  disabled={loading || query.page <= 1}
                  onClick={() => goTo({ page: 1 })}
                >
                  First
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={loading || query.page <= 1}
                  onClick={() => goTo({ page: query.page - 1 })}
                >
                  Previous
                </button>
                <form
                  className="nd-page-jump"
                  onSubmit={(event) => {
                    event.preventDefault();
                    jumpToPage();
                  }}
                >
                  <label>
                    <span>Page</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={pageCount}
                      value={pageInput}
                      onChange={(event) => setPageInput(event.target.value)}
                      onBlur={jumpToPage}
                      aria-label="Page number"
                    />
                  </label>
                  <span>of {pageCount.toLocaleString()}</span>
                </form>
                <button
                  type="button"
                  className="ghost"
                  disabled={loading || query.page >= pageCount}
                  onClick={() => goTo({ page: query.page + 1 })}
                >
                  Next
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={loading || query.page >= pageCount}
                  onClick={() => goTo({ page: pageCount })}
                >
                  Last
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <DatHubPromoModal
        open={promoOpen}
        onClose={() => setPromoOpen(false)}
        copy="Browsing new carriers? Message us on WhatsApp for DAT Loadboard access."
        dismissLabel="Continue to carriers"
      />
    </div>
  );
}
