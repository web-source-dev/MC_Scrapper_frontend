"use client";

import { type FormEvent } from "react";
import type { MetaResponse, SearchFormState, SearchMode } from "@/lib/types";
import { EquipmentSelect } from "./EquipmentSelect";
import { FilterChip } from "./FilterChip";
import { MultiSelectChip } from "./MultiSelectChip";

type Props = {
  meta: MetaResponse;
  form: SearchFormState;
  loading: boolean;
  remaining?: number;
  clockBlocked?: boolean;
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

const REQUIREMENT_OPTIONS = [
  { id: "requirePhone", label: "Has phone" },
  { id: "requireCell", label: "Has cell" },
  { id: "requireEmail", label: "Has email" },
  { id: "requireContact", label: "Phone or email" },
  { id: "hazmatOnly", label: "Hazmat only" },
  { id: "interstateOnly", label: "Interstate" },
  { id: "intrastateOnly", label: "Intrastate" },
  { id: "freightOnly", label: "Freight only" },
] as const;

export function SearchForm({ meta, form, loading, remaining, clockBlocked, onChange, onSubmit }: Props) {
  const mode = form.searchMode;
  const showStateFilter = mode !== "location";
  const fleets = meta.fleetPresets?.length ? meta.fleetPresets : FALLBACK_FLEETS;
  const mcsOptions = meta.mcs150Options?.length ? meta.mcs150Options : FALLBACK_MCS;

  function applyFleet(id: string) {
    const preset = fleets.find((item) => item.id === id) || fleets[0];
    onChange({
      fleetPreset: preset.id,
      minTrucks: preset.minTrucks,
      maxTrucks: preset.maxTrucks,
    });
  }

  const selectedRequirements = REQUIREMENT_OPTIONS.filter((item) => form[item.id]).map((item) => item.id);

  function applyRequirements(ids: string[]) {
    onChange({
      requirePhone: ids.includes("requirePhone"),
      requireCell: ids.includes("requireCell"),
      requireEmail: ids.includes("requireEmail"),
      requireContact: ids.includes("requireContact"),
      hazmatOnly: ids.includes("hazmatOnly"),
      interstateOnly: ids.includes("interstateOnly"),
      intrastateOnly: ids.includes("intrastateOnly"),
      freightOnly: ids.includes("freightOnly"),
    });
  }

  function clearFilters() {
    onChange({
      equipmentTypes: [],
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

  return (
    <form className="search-card search-bar" onSubmit={onSubmit}>
      <div className="chip-row" role="group" aria-label="Search filters">
        <FilterChip
          label="Search"
          value={form.searchMode}
          options={meta.searchModes}
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
        />
        <MultiSelectChip
          label="Requirements"
          emptyLabel="Any"
          options={[...REQUIREMENT_OPTIONS]}
          selected={selectedRequirements}
          onChange={applyRequirements}
          exclusivePairs={[["interstateOnly", "intrastateOnly"]]}
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
        <button className="text-btn reset-filters" type="button" onClick={clearFilters}>
          Reset
        </button>
        {clockBlocked ? (
          <p className="quota-hint">Search is locked until this computer’s day and date are correct.</p>
        ) : remaining != null ? (
          <p className="quota-hint">{remaining.toLocaleString()} MCs left today</p>
        ) : null}
      </div>

      <div className="search-row">
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
          <div className="field">
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

        {mode === "location" || showStateFilter ? (
          <>
            <div className="field">
              <label htmlFor="filter-city">City</label>
              <input
                id="filter-city"
                placeholder={mode === "location" ? "City" : "Any"}
                value={form.city}
                onChange={(event) => onChange({ city: event.target.value })}
              />
            </div>
            <div className="field tight">
              <label htmlFor="filter-zip">ZIP</label>
              <input
                id="filter-zip"
                inputMode="numeric"
                placeholder={mode === "location" ? "ZIP" : "Any"}
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
    </form>
  );
}
