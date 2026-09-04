"use client";

import { useEffect, useState } from "react";
import { fetchMeta } from "@/lib/api";
import type { MetaResponse } from "@/lib/types";

export function SourceStatus() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  const live = Boolean(meta?.qcMobile && meta.qcProxy?.enabled);
  const full = live ? "Live data" : meta ? "Census only" : "Connecting";
  const short = live ? "Live" : meta ? "Census" : "…";

  return (
    <span className={`status-pill ${live ? "is-live" : meta ? "is-warn" : "is-wait"}`} title={full}>
      <span className="status-pill-label-full">{full}</span>
      <span className="status-pill-label-short">{short}</span>
    </span>
  );
}
