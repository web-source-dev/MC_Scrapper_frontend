"use client";

import { useEffect } from "react";
import { wakeBackend } from "@/lib/wakeBackend";

/** Pings the API as soon as the site loads so free-tier backends warm up before user actions. */
export function BackendWake() {
  useEffect(() => {
    void wakeBackend();
  }, []);
  return null;
}
