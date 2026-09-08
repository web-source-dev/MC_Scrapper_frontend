"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MobileFilterSheet, useIsMobileFilter } from "@/lib/filterMenuPortal";
import { LockMark } from "./FilterChip";

export type MultiSelectOption = {
  id: string;
  label: string;
};

type Props = {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel?: string;
  exclusivePairs?: Array<[string, string]>;
  locked?: boolean;
  lockHint?: string;
  lockHref?: string;
};

export function MultiSelectChip({
  label,
  options,
  selected,
  onChange,
  emptyLabel = "Any",
  exclusivePairs = [],
  locked = false,
  lockHint = "Available on a higher plan",
  lockHref = "/plans",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const isMobile = useIsMobileFilter();
  const noneSelected = selected.length === 0;
  const firstLabel = options.find((option) => option.id === selected[0])?.label || selected[0];
  const summary = noneSelected
    ? label
    : selected.length === 1
      ? `${label} - ${firstLabel}`
      : `${label} - ${selected.length}`;
  const searchable = options.length > 10;
  const grid = options.length > 6;
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (option) => option.label.toLowerCase().includes(term) || option.id.toLowerCase().includes(term),
    );
  }, [options, query]);

  useEffect(() => {
    if (isMobile) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (locked) {
    return (
      <div className="filter-chip is-locked">
        <Link href={lockHref} className="filter-chip-btn is-locked" title={lockHint}>
          <span>{label}</span>
          <LockMark />
        </Link>
      </div>
    );
  }

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((value) => value !== id));
      return;
    }
    const exclusive = exclusivePairs.find((pair) => pair.includes(id));
    const blocked = exclusive ? exclusive.find((value) => value !== id) : undefined;
    onChange([...selected.filter((value) => value !== blocked), id]);
  }

  const optionsList = (
    <>
      {searchable ? (
        <input
          className="filter-chip-search"
          value={query}
          placeholder={`Search ${label.toLowerCase()}`}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus={isMobile}
        />
      ) : null}
      <div className={grid ? "filter-chip-list is-split" : "filter-chip-list"}>
        <label className="filter-chip-option is-wide">
          <input type="checkbox" checked={noneSelected} onChange={() => onChange([])} />
          {emptyLabel}
        </label>
        {visible.map((option) => (
          <label key={option.id} className="filter-chip-option">
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={() => toggle(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </>
  );

  return (
    <div className="filter-chip" ref={rootRef}>
      <button
        type="button"
        className={noneSelected ? "filter-chip-btn" : "filter-chip-btn is-on"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{summary}</span>
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      {isMobile ? (
        <MobileFilterSheet
          open={open}
          title={label}
          onClose={() => setOpen(false)}
          menuRef={menuRef}
          menuId={listId}
          multi
        >
          {optionsList}
        </MobileFilterSheet>
      ) : open ? (
        <div
          className={grid ? "filter-chip-menu is-wide" : "filter-chip-menu"}
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          ref={menuRef}
        >
          {optionsList}
        </div>
      ) : null}
    </div>
  );
}
