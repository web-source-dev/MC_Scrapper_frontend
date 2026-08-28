"use client";

import { useState, type ReactNode } from "react";
import type { Carrier, CarrierAddress, QcSnapshot, UnitCounts } from "@/lib/types";
import { CarrierBrief } from "./CarrierBrief";
import { CarrierReviews } from "./CarrierReviews";
import { CopyValue } from "./CopyValue";
import { openCarrierEmail } from "@/lib/email";

type Props = {
  carrier: Carrier;
  snapshot: QcSnapshot | null;
  snapshotLoading?: boolean;
};

const EMPTY_UNITS: UnitCounts = { owned: 0, termLeased: 0, tripLeased: 0, total: 0 };

function dash(value: unknown) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function sameAddress(a?: CarrierAddress | null, b?: CarrierAddress | null) {
  const key = (address?: CarrierAddress | null) =>
    [address?.street, address?.city, address?.state, address?.zip, address?.country]
      .map((part) => String(part || "").trim().toLowerCase())
      .join("|");
  return Boolean(a && b && key(a) === key(b));
}

function AddressBlock({ address, label }: { address?: CarrierAddress | null; label: string }) {
  const cityLine = [address?.city, address?.state, address?.zip].filter(Boolean).join(", ");
  const line = address?.line || [address?.street, cityLine, address?.country].filter(Boolean).join(", ");
  if (!hasValue(address?.street) && !hasValue(cityLine)) {
    return (
      <section className="profile-group">
        <h3>{label}</h3>
        <p className="hint">—</p>
      </section>
    );
  }

  return (
    <section className="profile-group">
      <h3>{label}</h3>
      <p className="profile-address">
        {hasValue(address?.street) ? <span>{address?.street}</span> : null}
        {hasValue(cityLine) ? <span>{cityLine}</span> : null}
        <CopyValue value={line} label={`${label} address`} compact />
      </p>
    </section>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: unknown;
  children?: ReactNode;
}) {
  if (!hasValue(value)) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children ?? dash(value)}</dd>
    </div>
  );
}

function UnitsTable({
  trucks,
  tractors,
  trailers,
}: {
  trucks: UnitCounts;
  tractors: UnitCounts;
  trailers: UnitCounts;
}) {
  const rows = [
    ["Trucks", trucks],
    ["Tractors", tractors],
    ["Trailers", trailers],
  ] as const;

  return (
    <table className="profile-table">
      <thead>
        <tr>
          <th>Equipment</th>
          <th>Owned</th>
          <th>Term lease</th>
          <th>Trip lease</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, units]) => (
          <tr key={label}>
            <td>{label}</td>
            <td className="mono">{units.owned}</td>
            <td className="mono">{units.termLeased}</td>
            <td className="mono">{units.tripLeased}</td>
            <td className="mono">{units.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function yn(value: unknown) {
  const text = String(value || "").trim().toUpperCase();
  if (text === "Y" || text === "YES" || text === "TRUE") return "Yes";
  if (text === "N" || text === "NO" || text === "FALSE") return "No";
  return dash(value);
}

function OosBlock({ oos }: { oos: unknown }) {
  const items = Array.isArray(oos) ? oos : oos && typeof oos === "object" ? [oos] : [];
  const rows = items.filter((item) => {
    if (item == null) return false;
    if (typeof item === "string" || typeof item === "number") return String(item).trim() !== "";
    if (typeof item !== "object") return false;
    return Object.keys(item as object).length > 0;
  });

  if (!rows.length) {
    return <p className="hint">No out-of-service record on file.</p>;
  }

  return (
    <ul className="profile-list">
      {rows.map((item, index) => {
        if (typeof item === "string" || typeof item === "number") {
          return <li key={index}>{String(item)}</li>;
        }
        const record = item as Record<string, unknown>;
        const parts = [
          record.oosDate || record.date || record.oos_date,
          record.reason || record.oosReason || record.status,
          record.description,
        ].filter(Boolean);
        return <li key={index}>{parts.length ? parts.map(String).join(" · ") : JSON.stringify(record)}</li>;
      })}
    </ul>
  );
}

function SnapshotPanel({ snapshot, loading }: { snapshot: QcSnapshot | null; loading?: boolean }) {
  if (loading && !snapshot) {
    return (
      <div className="profile-grid" role="tabpanel">
        <section className="profile-group">
          <h3>Live snapshot</h3>
          <p className="hint">Loading authority, BASICs, and OOS…</p>
        </section>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="profile-grid" role="tabpanel">
        <section className="profile-group">
          <h3>Live snapshot</h3>
          <p className="hint">Open this tab to load live authority, BASICs, and OOS.</p>
        </section>
      </div>
    );
  }

  if (!snapshot.available) {
    return (
      <div className="profile-grid" role="tabpanel">
        <section className="profile-group">
          <h3>Live snapshot</h3>
          <p className="hint">{snapshot.reason || "Live QCMobile data is not available for this carrier."}</p>
        </section>
      </div>
    );
  }

  const basics = snapshot.basics || [];
  const authority = snapshot.authority || [];

  return (
    <div className="profile-grid" role="tabpanel">
      <section className="profile-group profile-span">
        <h3>Operating status</h3>
        <dl className="profile-inline profile-inline-4">
          <div>
            <dt>Allowed</dt>
            <dd>{yn(snapshot.allowToOperate)}</dd>
          </div>
          <div>
            <dt>Out of service</dt>
            <dd>{yn(snapshot.outOfService)}</dd>
          </div>
          <div>
            <dt>OOS date</dt>
            <dd>{dash(snapshot.outOfServiceDate)}</dd>
          </div>
          <div>
            <dt>Complaints</dt>
            <dd>{dash(snapshot.complaintCount)}</dd>
          </div>
        </dl>
      </section>
      <section className="profile-group">
        <h3>Authority</h3>
        {authority.length ? (
          <table className="profile-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Granted</th>
              </tr>
            </thead>
            <tbody>
              {authority.map((item, index) => (
                <tr key={`${item.type || "auth"}-${index}`}>
                  <td>{dash(item.type)}</td>
                  <td>{dash(item.status)}</td>
                  <td>{dash(item.granted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="hint">None listed</p>
        )}
        {snapshot.operationClass?.length ? (
          <p className="profile-note">{snapshot.operationClass.join(", ")}</p>
        ) : null}
      </section>
      <section className="profile-group">
        <h3>BASICs</h3>
        {basics.length ? (
          <table className="profile-table">
            <thead>
              <tr>
                <th>BASIC</th>
                <th>%</th>
                <th>On-road</th>
                <th>Serious</th>
                <th>Insp</th>
                <th>Viol</th>
              </tr>
            </thead>
            <tbody>
              {basics.map((item, index) => (
                <tr key={`${item.name || "basic"}-${index}`}>
                  <td>{dash(item.name)}</td>
                  <td className="mono">{dash(item.percentile)}</td>
                  <td>
                    <span className={`badge ${item.onRoadDeficient ? "bad" : "ok"}`}>
                      {item.onRoadDeficient ? "Def" : "OK"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${item.seriousDeficient ? "bad" : "ok"}`}>
                      {item.seriousDeficient ? "Def" : "OK"}
                    </span>
                  </td>
                  <td className="mono">{dash(item.inspectionsWithViolation)}</td>
                  <td className="mono">{dash(item.violations)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="hint">No percentiles on file</p>
        )}
        {snapshot.cargo?.length ? <p className="profile-note">{snapshot.cargo.join(", ")}</p> : null}
      </section>
      <section className="profile-group profile-span">
        <h3>Out of service</h3>
        <OosBlock oos={snapshot.oos} />
      </section>
    </div>
  );
}

type ProfileTab = "overview" | "fleet" | "safety" | "live" | "reports";

export function CarrierProfile({ carrier, snapshot, snapshotLoading }: Props) {
  const [tab, setTab] = useState<ProfileTab>("overview");
  const fleet = carrier.fleet;
  const drivers = carrier.driverCounts;
  const dockets = carrier.dockets || [];

  return (
    <div className="carrier-profile">
      <div className="profile-tabs" role="tablist" aria-label="Carrier details">
        {(
          [
            ["overview", "Overview"],
            ["fleet", "Fleet"],
            ["safety", "Safety"],
            ["live", "Live snapshot"],
            ["reports", "Reports"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-on" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="profile-grid" role="tabpanel">
          <CarrierBrief
            carrier={carrier}
            snapshot={snapshot}
            snapshotLoading={snapshotLoading}
          />
          <section className="profile-group">
            <h3>Identity</h3>
            <dl>
              <Field label="Legal name" value={carrier.legalName}>
                <CopyValue value={carrier.legalName} label="legal name" compact />
              </Field>
              <Field label="DBA" value={carrier.dbaName}>
                <CopyValue value={carrier.dbaName} label="DBA" compact />
              </Field>
              <Field label="Officer" value={carrier.officer} />
              <Field label="Officer 2" value={carrier.officer2} />
              <Field label="Entity" value={carrier.businessType} />
              <Field label="DUNS" value={carrier.duns}>
                <CopyValue value={carrier.duns} label="DUNS" compact />
              </Field>
              <Field label="Class" value={carrier.operationClass} />
              <Field label="Operation" value={carrier.carrierOperation} />
            </dl>
          </section>
          <AddressBlock address={carrier.physicalAddress} label="Physical address" />
          {sameAddress(carrier.physicalAddress, carrier.mailingAddress) ? (
            <section className="profile-group">
              <h3>Mailing address</h3>
              <p className="hint">Same as physical</p>
            </section>
          ) : (
            <AddressBlock address={carrier.mailingAddress} label="Mailing address" />
          )}
          <section className="profile-group">
            <h3>Contact</h3>
            <dl>
              <Field label="Phone" value={carrier.phone}>
                <CopyValue
                  value={carrier.phone}
                  label="phone"
                  href={carrier.phone ? `tel:${carrier.phone.replace(/\D/g, "")}` : undefined}
                  compact
                />
              </Field>
              <Field label="Cell" value={carrier.cellPhone}>
                <CopyValue
                  value={carrier.cellPhone}
                  label="cell phone"
                  href={carrier.cellPhone ? `tel:${carrier.cellPhone.replace(/\D/g, "")}` : undefined}
                  compact
                />
              </Field>
              <Field label="Fax" value={carrier.fax}>
                <CopyValue value={carrier.fax} label="fax" compact />
              </Field>
              <Field label="Email" value={carrier.email}>
                <div className="profile-email-row">
                  <CopyValue
                    value={carrier.email}
                    label="email"
                    href={carrier.email ? `mailto:${carrier.email}` : undefined}
                    compact
                  />
                  <button type="button" className="text-btn" onClick={() => openCarrierEmail(carrier)}>
                    Send
                  </button>
                </div>
              </Field>
            </dl>
          </section>
          <section className="profile-group">
            <h3>Dockets</h3>
            {dockets.length ? (
              <ul className="profile-dockets">
                {dockets.map((docket, index) => (
                  <li key={`${docket.display || docket.number || index}`}>
                    <CopyValue value={docket.display} label="docket" compact />
                    <span>{docket.statusLabel || dash(docket.status)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">No docket on file.</p>
            )}
            <dl>
              <Field label="USDOT" value={carrier.usdotStatus} />
              <Field label="Authority" value={carrier.authorityStatus} />
              <Field label="Added" value={carrier.addedDate} />
            </dl>
          </section>
        </div>
      ) : null}

      {tab === "fleet" ? (
        <div className="profile-grid" role="tabpanel">
          <section className="profile-group">
            <h3>Equipment</h3>
            <dl className="profile-inline">
              <div>
                <dt>Power units</dt>
                <dd className="mono">{fleet?.powerUnits ?? carrier.trucks}</dd>
              </div>
              <div>
                <dt>Truck units</dt>
                <dd className="mono">{fleet?.truckUnits ?? carrier.truckUnits}</dd>
              </div>
              <div>
                <dt>Bus units</dt>
                <dd className="mono">{fleet?.busUnits ?? carrier.busUnits ?? 0}</dd>
              </div>
            </dl>
            <UnitsTable
              trucks={fleet?.trucks || EMPTY_UNITS}
              tractors={fleet?.tractors || EMPTY_UNITS}
              trailers={fleet?.trailers || EMPTY_UNITS}
            />
          </section>
          <section className="profile-group">
            <h3>Drivers</h3>
            <dl>
              <Field label="Total" value={drivers?.total ?? carrier.drivers} />
              <Field label="CDL" value={drivers?.cdl} />
              <Field label="Interstate" value={drivers?.interstate} />
              <Field label="Intrastate" value={drivers?.intrastate} />
              <Field label="Leased / mo" value={drivers?.leasedMonthly} />
              <Field label="IS >100 mi" value={drivers?.interstateBeyond100} />
              <Field label="IS ≤100 mi" value={drivers?.interstateWithin100} />
              <Field label="IA >100 mi" value={drivers?.intrastateBeyond100} />
              <Field label="IA ≤100 mi" value={drivers?.intrastateWithin100} />
            </dl>
          </section>
          <section className="profile-group profile-span">
            <h3>Cargo</h3>
            <p>{carrier.equipment.length ? carrier.equipment.join(" · ") : "Equipment unspecified"}</p>
            <p>{carrier.cargo.length ? carrier.cargo.join(" · ") : "Cargo not specified"}</p>
          </section>
        </div>
      ) : null}

      {tab === "safety" ? (
        <div className="profile-grid" role="tabpanel">
          <section className="profile-group">
            <h3>Safety rating</h3>
            <dl>
              <Field label="Rating" value={carrier.safetyRating} />
              <Field label="Rated" value={carrier.safetyRatingDate} />
              <Field label="Review" value={carrier.reviewType || carrier.reviewDate}>
                {[carrier.reviewType, carrier.reviewDate].filter(Boolean).join(" · ")}
              </Field>
              <Field label="Crash rate" value={carrier.crashRate} />
              <div>
                <dt>Hazmat</dt>
                <dd>{carrier.hazmat ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Prior revoke</dt>
                <dd>
                  {carrier.priorRevoke
                    ? `Yes${carrier.priorRevokeDot ? ` · USDOT ${carrier.priorRevokeDot}` : ""}`
                    : "No"}
                </dd>
              </div>
              <Field label="MCSIP" value={carrier.mcsipStep || carrier.mcsipDate}>
                {[carrier.mcsipStep, carrier.mcsipDate].filter(Boolean).join(" · ")}
              </Field>
            </dl>
          </section>
          <section className="profile-group">
            <h3>MCS-150</h3>
            <dl>
              <Field label="Date" value={carrier.mcs150Date} />
              <Field label="Mileage" value={carrier.mcs150Mileage} />
              <Field label="Year" value={carrier.mcs150MileageYear} />
            </dl>
            <p className="profile-links">
              {carrier.saferUrl ? (
                <a href={carrier.saferUrl} target="_blank" rel="noreferrer">
                  SAFER
                </a>
              ) : null}
              {carrier.liUrl ? (
                <a href={carrier.liUrl} target="_blank" rel="noreferrer">
                  L&I
                </a>
              ) : null}
              {carrier.smsUrl ? (
                <a href={carrier.smsUrl} target="_blank" rel="noreferrer">
                  SMS
                </a>
              ) : null}
            </p>
          </section>
        </div>
      ) : null}

      {tab === "live" ? <SnapshotPanel snapshot={snapshot} loading={snapshotLoading} /> : null}

      {tab === "reports" ? (
        <div className="profile-grid" role="tabpanel">
          <CarrierReviews carrier={carrier} />
        </div>
      ) : null}
    </div>
  );
}
