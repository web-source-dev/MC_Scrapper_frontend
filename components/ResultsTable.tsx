"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { fetchCarrierSnapshot } from "@/lib/api";
import type { Carrier, QcSnapshot } from "@/lib/types";
import { CarrierProfile } from "./CarrierProfile";
import { BulkEmailModal } from "./BulkEmailModal";
import { MAIL_UI_ENABLED, openGmailPage, openTemplatesPage } from "@/lib/email";

type Props = {
  carriers: Carrier[];
  truncated?: boolean;
  onClear?: () => void;
  canExport?: boolean;
};

type SortKey = "mc" | "dot" | "name" | "state" | "trucks" | "safety";
type CopyKind = "mc" | "dot" | "phone" | "email" | "name";

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(carriers: Carrier[]) {
  const headers = [
    "MC",
    "USDOT",
    "Legal Name",
    "DBA",
    "Officer 1",
    "Officer 2",
    "Entity",
    "DUNS",
    "Phone",
    "Cell",
    "Fax",
    "Email",
    "Physical Street",
    "Physical City",
    "Physical State",
    "Physical ZIP",
    "Mailing Street",
    "Mailing City",
    "Mailing State",
    "Mailing ZIP",
    "Power Units",
    "Truck Units",
    "Owned Trucks",
    "Term Trucks",
    "Trip Trucks",
    "Owned Tractors",
    "Term Tractors",
    "Trip Tractors",
    "Owned Trailers",
    "Term Trailers",
    "Trip Trailers",
    "Drivers",
    "CDL Drivers",
    "Interstate Drivers",
    "Intrastate Drivers",
    "Dockets",
    "Equipment",
    "Cargo",
    "Safety Rating",
    "Safety Rating Date",
    "USDOT Status",
    "Authority",
    "Prior Revoke",
    "MCSIP Step",
    "MCS-150 Date",
    "MCS-150 Mileage",
    "Hazmat",
    "SAFER URL",
    "L&I URL",
    "SMS URL",
  ];
  const lines = carriers.map((carrier) =>
    [
      carrier.mcDisplay,
      carrier.dotNumber,
      carrier.legalName,
      carrier.dbaName,
      carrier.officer,
      carrier.officer2,
      carrier.businessType,
      carrier.duns,
      carrier.phone,
      carrier.cellPhone,
      carrier.fax,
      carrier.email,
      carrier.physicalAddress?.street,
      carrier.physicalAddress?.city,
      carrier.physicalAddress?.state,
      carrier.physicalAddress?.zip,
      carrier.mailingAddress?.street,
      carrier.mailingAddress?.city,
      carrier.mailingAddress?.state,
      carrier.mailingAddress?.zip,
      carrier.fleet?.powerUnits ?? carrier.trucks,
      carrier.fleet?.truckUnits ?? carrier.truckUnits,
      carrier.fleet?.trucks?.owned,
      carrier.fleet?.trucks?.termLeased,
      carrier.fleet?.trucks?.tripLeased,
      carrier.fleet?.tractors?.owned,
      carrier.fleet?.tractors?.termLeased,
      carrier.fleet?.tractors?.tripLeased,
      carrier.fleet?.trailers?.owned,
      carrier.fleet?.trailers?.termLeased,
      carrier.fleet?.trailers?.tripLeased,
      carrier.drivers,
      carrier.driverCounts?.cdl,
      carrier.driverCounts?.interstate,
      carrier.driverCounts?.intrastate,
      (carrier.dockets || [])
        .map((docket) => `${docket.display || ""} ${docket.statusLabel || ""}`.trim())
        .join("; "),
      carrier.equipment.join("; "),
      carrier.cargo.join("; "),
      carrier.safetyRating,
      carrier.safetyRatingDate,
      carrier.usdotStatus,
      carrier.authorityStatus,
      carrier.priorRevoke ? "Y" : "N",
      carrier.mcsipStep,
      carrier.mcs150Date,
      carrier.mcs150Mileage,
      carrier.hazmat ? "Y" : "N",
      carrier.saferUrl,
      carrier.liUrl,
      carrier.smsUrl,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

function safetyClass(rating: string) {
  if (rating === "Satisfactory") return "ok";
  if (rating === "Conditional") return "warn";
  if (rating === "Unsatisfactory") return "bad";
  return "muted";
}

function copyText(carriers: Carrier[], kind: CopyKind) {
  return carriers
    .map((carrier) => {
      if (kind === "mc") return carrier.mcDisplay;
      if (kind === "dot") return carrier.dotNumber ? String(carrier.dotNumber) : null;
      if (kind === "phone") return carrier.phone;
      if (kind === "email") return carrier.email;
      return carrier.legalName;
    })
    .filter(Boolean)
    .join("\n");
}

function compare(a: Carrier, b: Carrier, key: SortKey) {
  if (key === "mc") return (a.mcNumber || 0) - (b.mcNumber || 0);
  if (key === "dot") return (a.dotNumber || 0) - (b.dotNumber || 0);
  if (key === "trucks") return a.trucks - b.trucks;
  if (key === "state") return String(a.physicalAddress.state || "").localeCompare(String(b.physicalAddress.state || ""));
  if (key === "safety") return a.safetyRating.localeCompare(b.safetyRating);
  return String(a.legalName || "").localeCompare(String(b.legalName || ""));
}

const PAGE_SIZE = 50;

function snapshotFor(carrier: Carrier, cache: Record<string, QcSnapshot>) {
  return carrier.snapshot || cache[carrier.id] || null;
}

export function ResultsTable({ carriers, truncated, onClear, canExport = true }: Props) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mc");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [snapshots, setSnapshots] = useState<Record<string, QcSnapshot>>({});
  const [snapshotLoading, setSnapshotLoading] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const requestedSnapshots = useRef<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = needle
      ? carriers.filter((carrier) =>
          [
            carrier.mcDisplay,
            carrier.dotNumber,
            carrier.legalName,
            carrier.dbaName,
            carrier.location,
            carrier.phone,
            carrier.email,
            carrier.equipment.join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
      : carriers;

    const sorted = [...rows].sort((a, b) => compare(a, b, sortKey));
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [carriers, query, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedRows = filtered.filter((carrier) => selected.has(carrier.id));
  const workingSet = selectedRows.length ? selectedRows : filtered;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "trucks" ? "desc" : "asc");
  }

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    const ids = pageRows.map((carrier) => carrier.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((current) => {
      const next = new Set(current);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function downloadCsv() {
    const blob = new Blob([toCsv(workingSet)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "verified-carriers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyKind(kind: CopyKind) {
    await navigator.clipboard.writeText(copyText(workingSet, kind));
    setCopied(kind);
    window.setTimeout(() => setCopied(""), 1600);
  }

  function expandCarrier(id: string) {
    setExpanded((current) => {
      const next = current === id ? null : id;
      if (next && !snapshots[next]) {
        setSnapshotLoading((loading) => ({ ...loading, [next]: true }));
      }
      return next;
    });
  }

  useEffect(() => {
    if (!expanded) return;
    const carrier = carriers.find((row) => row.id === expanded);
    if (!carrier) return;
    if (snapshotFor(carrier, snapshots) || requestedSnapshots.current.has(carrier.id)) return;

    requestedSnapshots.current.add(carrier.id);
    setSnapshotLoading((current) => ({ ...current, [carrier.id]: true }));

    fetchCarrierSnapshot({ mc: carrier.mcNumber, dot: carrier.dotNumber })
      .then((snapshot) => {
        setSnapshots((current) => ({ ...current, [carrier.id]: snapshot }));
      })
      .catch(() => {
        requestedSnapshots.current.delete(carrier.id);
        setSnapshots((current) => ({
          ...current,
          [carrier.id]: {
            available: false,
            reason: "Live snapshot request failed. Try expanding the row again.",
          },
        }));
      })
      .finally(() => {
        setSnapshotLoading((current) => {
          const next = { ...current };
          delete next[carrier.id];
          return next;
        });
      });
  }, [expanded, carriers, snapshots]);

  if (carriers.length === 0) {
    return (
      <div className="empty">
        <h2>No matching carriers</h2>
        <p>Widen the search or reset filters.</p>
      </div>
    );
  }

  return (
    <section className="results" aria-live="polite">
      {truncated ? (
        <p className="banner warn">Results were capped. Narrow the search or raise the limit.</p>
      ) : null}

      <div className="results-toolbar">
        <label className="search-inline">
          <span className="sr-only">Filter results</span>
          <input
            type="search"
            placeholder="Filter results…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="toolbar-actions">
          <label className="copy-select">
            <span className="sr-only">Copy</span>
            <select
              value=""
              onChange={(event) => {
                const kind = event.target.value as CopyKind;
                if (kind) void copyKind(kind);
                event.target.value = "";
              }}
            >
              <option value="">{copied ? "Copied" : "Copy"}</option>
              <option value="mc">MC numbers</option>
              <option value="dot">USDOT numbers</option>
              <option value="phone">Phones</option>
              <option value="email">Emails</option>
            </select>
          </label>
          {MAIL_UI_ENABLED ? (
            <button type="button" className="ghost toolbar-btn" onClick={() => setBulkOpen(true)}>
              <span className="toolbar-btn-full">Bulk email</span>
              <span className="toolbar-btn-short">Email</span>
            </button>
          ) : null}
          {canExport ? (
            <button type="button" className="ghost toolbar-btn" onClick={downloadCsv}>
              Export
            </button>
          ) : (
            <a className="ghost toolbar-btn is-locked" href="/plans" title="CSV export is on Free and above. Message us if this is missing.">
              Export
            </a>
          )}
          {onClear ? (
            <button type="button" className="ghost toolbar-btn" onClick={onClear}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="results-mobile-bar">
        <label className="mobile-sort">
          <span className="sr-only">Sort by</span>
          <select
            value={`${sortKey}-${sortDir}`}
            onChange={(event) => {
              const [key, dir] = event.target.value.split("-") as [SortKey, "asc" | "desc"];
              setSortKey(key);
              setSortDir(dir);
              setPage(1);
            }}
          >
            <option value="mc-asc">MC ↑</option>
            <option value="mc-desc">MC ↓</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="trucks-desc">Trucks ↓</option>
            <option value="trucks-asc">Trucks ↑</option>
            <option value="state-asc">State A–Z</option>
            <option value="safety-asc">Safety A–Z</option>
          </select>
        </label>
        <button type="button" className="ghost mobile-select-page" onClick={togglePage}>
          {pageRows.length > 0 && pageRows.every((row) => selected.has(row.id)) ? "Deselect page" : "Select page"}
        </button>
      </div>

      <div className="results-mobile-list">
        {pageRows.map((carrier) => (
          <article
            key={carrier.id}
            className={`result-card ${expanded === carrier.id ? "is-open" : ""} ${selected.has(carrier.id) ? "is-selected" : ""}`}
          >
            <div
              className="result-card-head"
              onClick={() => expandCarrier(carrier.id)}
            >
              <input
                type="checkbox"
                className="result-card-check"
                checked={selected.has(carrier.id)}
                onChange={() => toggleRow(carrier.id)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select ${carrier.mcDisplay || carrier.legalName}`}
              />
              <div className="result-card-body">
                <div className="result-card-top">
                  <span className="result-card-mc mono">{carrier.mcDisplay || "—"}</span>
                  <span className={`badge ${safetyClass(carrier.safetyRating)}`}>{carrier.safetyRating}</span>
                  {carrier.hazmat ? <span className="chip haz">HM</span> : null}
                </div>
                <strong className="result-card-name">{carrier.legalName || "Unnamed carrier"}</strong>
                {carrier.dbaName ? <span className="result-card-dba">{carrier.dbaName}</span> : null}
                <p className="result-card-meta">
                  {[carrier.location, `${carrier.trucks} trucks`, carrier.dotNumber ? `DOT ${carrier.dotNumber}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {carrier.phone ? (
                <a
                  className="result-card-call"
                  href={`tel:${carrier.phone.replace(/\D/g, "")}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  Call
                </a>
              ) : null}
            </div>
            {expanded === carrier.id ? (
              <div className="result-card-detail">
                <CarrierProfile
                  carrier={carrier}
                  snapshot={snapshotFor(carrier, snapshots)}
                  snapshotLoading={Boolean(snapshotLoading[carrier.id])}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="check-col">
                <input
                  type="checkbox"
                  checked={pageRows.length > 0 && pageRows.every((row) => selected.has(row.id))}
                  onChange={togglePage}
                  aria-label="Select page"
                />
              </th>
              <th>
                <button type="button" className="th-btn" onClick={() => toggleSort("mc")}>
                  MC
                </button>
              </th>
              <th>
                <button type="button" className="th-btn" onClick={() => toggleSort("dot")}>
                  USDOT
                </button>
              </th>
              <th>
                <button type="button" className="th-btn" onClick={() => toggleSort("name")}>
                  Carrier
                </button>
              </th>
              <th>
                <button type="button" className="th-btn" onClick={() => toggleSort("state")}>
                  Location
                </button>
              </th>
              <th>
                <button type="button" className="th-btn" onClick={() => toggleSort("trucks")}>
                  Trucks
                </button>
              </th>
              <th>
                <button type="button" className="th-btn" onClick={() => toggleSort("safety")}>
                  Safety
                </button>
              </th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((carrier) => (
              <Fragment key={carrier.id}>
                <tr
                  className={expanded === carrier.id ? "is-open" : undefined}
                  onClick={() => expandCarrier(carrier.id)}
                >
                  <td className="check-col" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(carrier.id)}
                      onChange={() => toggleRow(carrier.id)}
                      aria-label={`Select ${carrier.mcDisplay || carrier.legalName}`}
                    />
                  </td>
                  <td className="mono">{carrier.mcDisplay || "—"}</td>
                  <td className="mono">{carrier.dotNumber || "—"}</td>
                  <td>
                    <strong>{carrier.legalName || "Unnamed carrier"}</strong>
                    {carrier.dbaName ? <span className="dba">{carrier.dbaName}</span> : null}
                  </td>
                  <td>{carrier.location || "—"}</td>
                  <td className="mono">{carrier.trucks}</td>
                  <td>
                    <span className={`badge ${safetyClass(carrier.safetyRating)}`}>
                      {carrier.safetyRating}
                    </span>
                    {carrier.hazmat ? <span className="chip haz">HM</span> : null}
                  </td>
                  <td className="nowrap">{carrier.phone || "—"}</td>
                </tr>
                {expanded === carrier.id ? (
                  <tr className="detail-row">
                    <td colSpan={8}>
                      <CarrierProfile
                        carrier={carrier}
                        snapshot={snapshotFor(carrier, snapshots)}
                        snapshotLoading={Boolean(snapshotLoading[carrier.id])}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <p className="table-note">
          Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
          {filtered.length}
          {selected.size ? ` · ${selected.size} selected` : ""}
        </p>
        <div className="pager">
          <button
            type="button"
            className="ghost"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </button>
          <span>
            Page {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            className="ghost"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Next
          </button>
        </div>
      </div>
      {MAIL_UI_ENABLED && bulkOpen ? (
        <BulkEmailModal
          carriers={workingSet}
          selectedCount={selectedRows.length}
          onClose={() => setBulkOpen(false)}
          onOpenTemplates={() => {
            setBulkOpen(false);
            openTemplatesPage();
          }}
          onOpenGmail={() => {
            setBulkOpen(false);
            openGmailPage();
          }}
        />
      ) : null}
    </section>
  );
}
