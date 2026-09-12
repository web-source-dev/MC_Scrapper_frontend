"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { MetaResponse, SearchFormState, SearchMode } from "@/lib/types";
import { allowedSearchModes, featuresForUser, hasFeature, type FeatureId } from "@/lib/features";
import { CargoSelect } from "./CargoSelect";
import { EquipmentSelect } from "./EquipmentSelect";
import { FilterChip } from "./FilterChip";
import { MultiSelectChip } from "./MultiSelectChip";

type Props = {
  meta: MetaResponse;
  form: SearchFormState;
  loading: boolean;
  remaining?: number;
  clockBlocked?: boolean;
  features?: string[];
  onChange: (patch: Partial<SearchFormState>) => void;
  onSubmit: (event: FormEvent) => void;
};

const FALLBACK_FLEETS = [
  { id: "any", label: "Any size", minTrucks: "", maxTrucks: "" },
  { id: "oo", label: "Owner-op (1)", minTrucks: "1", maxTrucks: "1" },
  { id: "small", label: "Small (2–5)", minTrucks: "2", maxTrucks: "5" },
  { id: "mid", label: "Mid (6–15)", minTrucks: "6", maxTrucks: "15" },
  { id: "large", label: "Large (16+)", minTrucks: "16", maxTrucks: "" },
];

const FALLBACK_MCS = [
  { id: "any", label: "Any MCS-150 date" },
  { id: "12", label: "Updated in last 12 months" },
  { id: "24", label: "Updated in last 24 months" },
];

const RESULT_LIMITS = [
  { id: "500", label: "500" },
  { id: "1000", label: "1,000" },
  { id: "2500", label: "2,500" },
  { id: "5000", label: "5,000" },
  { id: "10000", label: "10,000" },
];

const CONTACT_OPTIONS = [
  { id: "requirePhone", label: "Has phone" },
  { id: "requireCell", label: "Has cell" },
  { id: "requireEmail", label: "Has email" },
  { id: "requireContact", label: "Phone or email" },
] as const;

const ADVANCED_REQUIREMENTS = [
  { id: "hazmatOnly", label: "Hazmat only" },
  { id: "interstateOnly", label: "Interstate" },
  { id: "intrastateOnly", label: "Intrastate" },
  { id: "freightOnly", label: "Freight only" },
] as const;

const REQUIREMENT_OPTIONS = [...CONTACT_OPTIONS, ...ADVANCED_REQUIREMENTS];

function countActiveFilters(form: SearchFormState) {
  let count = 0;
  if (form.fleetPreset !== "any") count += 1;
  if (form.state) count += 1;
  if (form.safetyRating !== "any") count += 1;
  if (form.mcs150Months !== "any") count += 1;
  if (form.equipmentTypes?.length) count += 1;
  if (form.cargoTypes?.length) count += 1;
  if (REQUIREMENT_OPTIONS.some((item) => form[item.id])) count += 1;
  if (!form.strictSafer) count += 1;
  if (form.minTrucks && form.minTrucks !== "1") count += 1;
  if (form.maxTrucks) count += 1;
  if (form.minDrivers) count += 1;
  if (form.maxDrivers) count += 1;
  if (form.city) count += 1;
  if (form.zip) count += 1;
  return count;
}

export function SearchForm({ meta, form, loading, remaining, clockBlocked, features, onChange, onSubmit }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const mode = form.searchMode;
  const showStateFilter = mode !== "location";
  const fleets = meta.fleetPresets?.length ? meta.fleetPresets : FALLBACK_FLEETS;
  const mcsOptions = meta.mcs150Options?.length ? meta.mcs150Options : FALLBACK_MCS;
  const activeFilters = useMemo(() => countActiveFilters(form), [form]);
  const unlocked = featuresForUser({ features });
  const can = (id: FeatureId) => hasFeature(unlocked, id);
  const searchModes = meta.searchModes.filter((item) => allowedSearchModes(unlocked).includes(item.id));

  function applyFleet(id: string) {
    const preset = fleets.find((item) => item.id === id) || fleets[0];
    onChange({
      fleetPreset: preset.id,
      minTrucks: preset.minTrucks,
      maxTrucks: preset.maxTrucks,
    });
  }

  const selectedContacts = CONTACT_OPTIONS.filter((item) => form[item.id]).map((item) => item.id);
  const selectedAdvanced = ADVANCED_REQUIREMENTS.filter((item) => form[item.id]).map((item) => item.id);

  function clearFilters() {
    onChange({
      equipmentTypes: [],
      cargoTypes: [],
      minTrucks: "1",
      maxTrucks: "",
      minDrivers: "",
      maxDrivers: "",
      zip: "",
      city: mode === "location" ? form.city : "",
      state: mode === "location" ? form.state : "",
      fleetPreset: "any",
      safetyRating: "any",
      mcs150Months: "any",
      hazmatOnly: false,
      requirePhone: false,
      requireCell: false,
      requireEmail: false,
      requireContact: false,
      interstateOnly: false,
      intrastateOnly: false,
      freightOnly: false,
      strictSafer: true,
    });
  }

  const filterChipControls = (
    <>
      <FilterChip
        label="Search"
        value={form.searchMode}
        options={searchModes}
        onChange={(searchMode) => onChange({ searchMode: searchMode as SearchMode })}
        alwaysOn
        showSelectedOnly
      />
      {mode === "mc-lookup" || mode === "id-list" ? (
        <FilterChip
          label="Type"
          value={form.identifierType}
          options={[
            { id: "mc", label: "MC" },
            { id: "dot", label: "USDOT" },
          ]}
          onChange={(identifierType) => onChange({ identifierType: identifierType as "mc" | "dot" })}
          alwaysOn
        />
      ) : null}
      <FilterChip
        label="Fleet"
        value={form.fleetPreset}
        options={fleets}
        onChange={applyFleet}
        defaultValue="any"
        locked={!can("filters_fleet_safety")}
        lockHint="Fleet filters are on Standard and above"
      />
      <FilterChip
        label="State"
        value={form.state}
        options={[
          { id: "", label: mode === "location" ? "Select a state" : "All states" },
          ...meta.states.map((item) => ({ id: item.code, label: `${item.code} — ${item.name}`, short: item.code })),
        ]}
        onChange={(state) => onChange({ state })}
      />
      <FilterChip
        label="Safety"
        value={form.safetyRating}
        options={meta.safetyRatings}
        onChange={(safetyRating) => onChange({ safetyRating })}
        defaultValue="any"
        locked={!can("filters_fleet_safety")}
        lockHint="Safety filters are on Standard and above"
      />
      <FilterChip
        label="MCS-150"
        value={form.mcs150Months}
        options={mcsOptions.map((item) => ({
          id: item.id,
          label: item.label,
          short: item.id === "any" ? "Any" : `${item.id} mo`,
        }))}
        onChange={(mcs150Months) => onChange({ mcs150Months })}
        defaultValue="any"
        locked={!can("filters_fleet_safety")}
        lockHint="MCS-150 filters are on Standard and above"
      />
      <FilterChip
        label="Results"
        value={form.resultLimit}
        options={RESULT_LIMITS}
        onChange={(resultLimit) => onChange({ resultLimit })}
        alwaysOn
      />
      <EquipmentSelect
        options={meta.equipmentTypes}
        selected={form.equipmentTypes}
        onChange={(equipmentTypes) => onChange({ equipmentTypes })}
        locked={!can("filters_advanced")}
        lockHint="Equipment filters are on Plus and above"
      />
      <CargoSelect
        options={meta.cargoTypes || []}
        selected={form.cargoTypes || []}
        onChange={(cargoTypes) => onChange({ cargoTypes })}
        locked={!can("filters_advanced")}
        lockHint="Cargo filters are on Plus and above"
      />
      <MultiSelectChip
        label="Contacts"
        emptyLabel="Any"
        options={[...CONTACT_OPTIONS]}
        selected={selectedContacts}
        onChange={(ids) =>
          onChange({
            requirePhone: ids.includes("requirePhone"),
            requireCell: ids.includes("requireCell"),
            requireEmail: ids.includes("requireEmail"),
            requireContact: ids.includes("requireContact"),
          })
        }
        locked={!can("filters_contacts")}
        lockHint="Phone and email filters are on Standard and above"
      />
      <MultiSelectChip
        label="Requirements"
        emptyLabel="Any"
        options={[...ADVANCED_REQUIREMENTS]}
        selected={selectedAdvanced}
        onChange={(ids) =>
          onChange({
            hazmatOnly: ids.includes("hazmatOnly"),
            interstateOnly: ids.includes("interstateOnly"),
            intrastateOnly: ids.includes("intrastateOnly"),
            freightOnly: ids.includes("freightOnly"),
          })
        }
        exclusivePairs={[["interstateOnly", "intrastateOnly"]]}
        locked={!can("filters_advanced")}
        lockHint="Advanced filters are on Plus and above"
      />
      <FilterChip
        label="SAFER"
        value={form.strictSafer ? "strict" : "any"}
        options={[
          { id: "strict", label: "Strict" },
          { id: "any", label: "Any" },
        ]}
        onChange={(value) => onChange({ strictSafer: value === "strict" })}
        alwaysOn
      />
    </>
  );

  const filterChipFoot = (
    <>
      <button className="text-btn reset-filters" type="button" onClick={clearFilters}>
        Reset
      </button>
      {clockBlocked ? (
        <p className="quota-hint">Search is locked until this computer’s day and date are correct.</p>
      ) : remaining != null ? (
        <p className="quota-hint">{remaining.toLocaleString()} MCs available (day & month caps)</p>
      ) : null}
    </>
  );

  const filterChipsDesktop = (
    <div className="chip-row" role="group" aria-label="Search filters">
      {filterChipControls}
      {filterChipFoot}
    </div>
  );

  return (
    <form className="search-card search-bar" onSubmit={onSubmit}>
      <div className="search-row search-row-primary">
        {mode === "mc-range" ? (
          <>
            <div className="field">
              <label htmlFor="start-mc">From MC</label>
              <input
                id="start-mc"
                inputMode="numeric"
                placeholder="100000"
                value={form.startMc}
                onChange={(event) => onChange({ startMc: event.target.value.replace(/[^\d]/g, "") })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="end-mc">To MC</label>
              <input
                id="end-mc"
                inputMode="numeric"
                placeholder="100500"
                value={form.endMc}
                onChange={(event) => onChange({ endMc: event.target.value.replace(/[^\d]/g, "") })}
                required
              />
            </div>
          </>
        ) : null}

        {mode === "mc-lookup" ? (
          <div className="field grow">
            <label htmlFor="identifier">{form.identifierType === "dot" ? "USDOT" : "MC"}</label>
            <input
              id="identifier"
              inputMode="numeric"
              placeholder={form.identifierType === "dot" ? "USDOT number" : "MC number"}
              value={form.identifier}
              onChange={(event) => onChange({ identifier: event.target.value.replace(/[^\d]/g, "") })}
              required
            />
          </div>
        ) : null}

        {mode === "id-list" ? (
          <div className="field grow">
            <label htmlFor="id-list">Paste numbers</label>
            <input
              id="id-list"
              placeholder="Paste MC or USDOT numbers"
              value={form.idList}
              onChange={(event) => onChange({ idList: event.target.value })}
              required
            />
          </div>
        ) : null}

        {mode === "company-name" ? (
          <div className="field grow">
            <label htmlFor="company-name">Company name</label>
            <input
              id="company-name"
              placeholder="Company name"
              value={form.companyName}
              onChange={(event) => onChange({ companyName: event.target.value })}
              required
              minLength={3}
            />
          </div>
        ) : null}

        {mode === "phone" ? (
          <div className="field grow">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              inputMode="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              required
            />
          </div>
        ) : null}

        {mode === "location" ? (
          <>
            <div className="field">
              <label htmlFor="filter-city">City</label>
              <input
                id="filter-city"
                placeholder="City"
                value={form.city}
                onChange={(event) => onChange({ city: event.target.value })}
              />
            </div>
            <div className="field tight">
              <label htmlFor="filter-zip">ZIP</label>
              <input
                id="filter-zip"
                inputMode="numeric"
                placeholder="ZIP"
                value={form.zip}
                onChange={(event) => onChange({ zip: event.target.value.replace(/\D/g, "").slice(0, 5) })}
              />
            </div>
          </>
        ) : null}

        <button className="primary search-submit" type="submit" disabled={loading || remaining === 0 || clockBlocked}>
          {loading
            ? "Searching…"
            : clockBlocked
              ? "Fix date"
              : remaining === 0
                ? "Limit reached"
                : "Search"}
        </button>
      </div>

      <div className="search-filters-wrap">
        <button
          type="button"
          className={`search-filters-toggle ${filtersOpen ? "is-open" : ""}`}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <span>Filters{activeFilters ? ` · ${activeFilters}` : ""}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className={`search-filters-panel ${filtersOpen ? "is-open" : ""}`}>
          <div className="search-filters-scroll">
            <div className="search-filters-track" role="group" aria-label="Search filters">
              {filterChipControls}
            </div>
          </div>
          <div className="search-filters-foot">{filterChipFoot}</div>
        </div>
        <div className="search-filters-desktop">{filterChipsDesktop}</div>
      </div>

      <div className="search-advanced">
        <button
          type="button"
          className={`search-advanced-toggle ${advancedOpen ? "is-open" : ""}`}
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
          disabled={!can("filters_advanced")}
          title={can("filters_advanced") ? undefined : "More options are on Plus and above"}
        >
          <span>More options{can("filters_advanced") ? "" : " · Plus"}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {can("filters_advanced") ? (
        <div className={`search-row search-row-advanced ${advancedOpen ? "is-open" : ""}`}>
          {mode !== "location" && showStateFilter ? (
            <>
              <div className="field">
                <label htmlFor="filter-city">City</label>
                <input
                  id="filter-city"
                  placeholder="Any"
                  value={form.city}
                  onChange={(event) => onChange({ city: event.target.value })}
                />
              </div>
              <div className="field tight">
                <label htmlFor="filter-zip">ZIP</label>
                <input
                  id="filter-zip"
                  inputMode="numeric"
                  placeholder="Any"
                  value={form.zip}
                  onChange={(event) => onChange({ zip: event.target.value.replace(/\D/g, "").slice(0, 5) })}
                />
              </div>
            </>
          ) : null}

          <div className="field tight">
            <label htmlFor="min-trucks">Min trucks</label>
            <input
              id="min-trucks"
              inputMode="numeric"
              placeholder="1"
              value={form.minTrucks}
              onChange={(event) =>
                onChange({ minTrucks: event.target.value.replace(/[^\d]/g, ""), fleetPreset: "any" })
              }
            />
          </div>
          <div className="field tight">
            <label htmlFor="max-trucks">Max trucks</label>
            <input
              id="max-trucks"
              inputMode="numeric"
              placeholder="Any"
              value={form.maxTrucks}
              onChange={(event) =>
                onChange({ maxTrucks: event.target.value.replace(/[^\d]/g, ""), fleetPreset: "any" })
              }
            />
          </div>
          <div className="field tight">
            <label htmlFor="min-drivers">Min drivers</label>
            <input
              id="min-drivers"
              inputMode="numeric"
              placeholder="Any"
              value={form.minDrivers}
              onChange={(event) => onChange({ minDrivers: event.target.value.replace(/[^\d]/g, "") })}
            />
          </div>
          <div className="field tight">
            <label htmlFor="max-drivers">Max drivers</label>
            <input
              id="max-drivers"
              inputMode="numeric"
              placeholder="Any"
              value={form.maxDrivers}
              onChange={(event) => onChange({ maxDrivers: event.target.value.replace(/[^\d]/g, "") })}
            />
          </div>
        </div>
        ) : null}
      </div>
    </form>
  );
}
