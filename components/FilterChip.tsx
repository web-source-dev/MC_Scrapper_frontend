"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

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
};

export function FilterChip({
  label,
  value,
  options,
  onChange,
  defaultValue = "",
  alwaysOn = false,
  showSelectedOnly = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
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
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

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
      {open ? (
        <div
          className={grid ? "filter-chip-menu is-wide" : "filter-chip-menu"}
          id={menuId}
          role="listbox"
        >
          {searchable ? (
            <input
              className="filter-chip-search"
              value={query}
              placeholder={`Search ${label.toLowerCase()}`}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
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
        </div>
      ) : null}
    </div>
  );
}
