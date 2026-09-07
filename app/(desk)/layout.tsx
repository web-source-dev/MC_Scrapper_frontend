"use client";

import { DeskShell } from "@/components/DeskShell";
import type { ReactNode } from "react";

export default function DeskLayout({ children }: { children: ReactNode }) {
  return <DeskShell>{children}</DeskShell>;
}
