"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MobileFilterSheet, useIsMobileFilter } from "@/lib/filterMenuPortal";

export type FilterChipOption = {
  id: string;
  label: string;
  short?: string;
};

type Props = {
  label: string;
  value: string;
  options: FilterChipOption[];
  onChange: (value: string) => void;
  defaultValue?: string;
  alwaysOn?: boolean;
  showSelectedOnly?: boolean;
  locked?: boolean;
  lockHint?: string;
  lockHref?: string;
};

export function FilterChip({
  label,
  value,
  options,
  onChange,
  defaultValue = "",
  alwaysOn = false,
  showSelectedOnly = false,
  locked = false,
  lockHint = "Available on a higher plan",
  lockHref = "/plans",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const isMobile = useIsMobileFilter();
  const selected = options.find((item) => item.id === value);
  const isOn = alwaysOn || (value !== defaultValue && value !== "");
  const selectedText = selected?.short || selected?.label || "";
  const summary = showSelectedOnly
    ? selectedText || label
    : isOn && selectedText
      ? `${label} - ${selectedText}`
      : label;
  const searchable = options.length > 10;
  const grid = options.length > 8;
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      [option.label, option.short, option.id].some((part) => part?.toLowerCase().includes(term)),
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
      <div className={grid ? "filter-chip-list is-grid" : "filter-chip-list"}>
        {visible.map((option) => {
          const wide = !option.short && (option.id === "" || option.label.length > 12);
          return (
            <button
              key={option.id || "empty"}
              type="button"
              role="option"
              aria-selected={option.id === value}
              className={[
                "filter-chip-option",
                option.id === value ? "is-on" : "",
                wide ? "is-wide" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              {grid ? option.short || option.label : option.label}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="filter-chip" ref={rootRef}>
      <button
        type="button"
        className={isOn ? "filter-chip-btn is-on" : "filter-chip-btn"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
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
          menuId={menuId}
        >
          {optionsList}
        </MobileFilterSheet>
      ) : open ? (
        <div
          className={grid ? "filter-chip-menu is-wide" : "filter-chip-menu"}
          id={menuId}
          role="listbox"
          ref={menuRef}
        >
          {optionsList}
        </div>
      ) : null}
    </div>
  );
}

export function LockMark() {
  return (
    <svg className="filter-lock" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M5 7V5.5A3 3 0 0 1 11 5.5V7M4 7h8v6.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
