"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode, type RefObject } from "react";

function listenMedia(mq: MediaQueryList, onChange: () => void) {
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }
  mq.addListener(onChange);
  return () => mq.removeListener(onChange);
}

function detectMobileFilter() {
  if (typeof window === "undefined") return false;
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  return width <= 900 || coarse || noHover;
}

export function useIsMobileFilter() {
  const [mobile, setMobile] = useState(true);

  useEffect(() => {
    const sync = () => setMobile(detectMobileFilter());
    sync();
    const queries = [
      window.matchMedia("(max-width: 900px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(hover: none)"),
    ];
    const stops = queries.map((mq) => listenMedia(mq, sync));
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      stops.forEach((stop) => stop());
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return mobile;
}

type PortalProps = {
  open: boolean;
  children: ReactNode;
};

export function FilterMenuPortal({ open, children }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      setVisible(true);
      return;
    }
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 320);
    return () => window.clearTimeout(timer);
  }, [open, mounted, visible]);

  if (!mounted || !visible) return null;
  return createPortal(children, document.body);
}

type SheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  menuRef?: RefObject<HTMLDivElement | null>;
  menuId?: string;
  role?: string;
  multi?: boolean;
};

export function MobileFilterSheet({
  open,
  title,
  onClose,
  children,
  menuRef,
  menuId,
  role = "listbox",
  multi = false,
}: SheetProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    setShown(false);
    const timer = window.setTimeout(() => setShown(true), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <FilterMenuPortal open={open}>
      <div className={`filter-sheet ${shown ? "is-shown" : "is-hidden"}`} role="presentation">
        <button
          type="button"
          className="filter-chip-backdrop"
          aria-label="Close filter menu"
          onClick={onClose}
        />
        <div
          className="filter-chip-menu is-mobile-sheet"
          id={menuId}
          role={role}
          aria-multiselectable={multi || undefined}
          ref={menuRef}
        >
          <div className="filter-sheet-handle" aria-hidden="true" />
          <div className="filter-chip-menu-head">
            <strong>{title}</strong>
            <button type="button" className="text-btn filter-chip-menu-done" onClick={onClose}>
              Done
            </button>
          </div>
          <div className="filter-sheet-body">{children}</div>
        </div>
      </div>
    </FilterMenuPortal>
  );
}
