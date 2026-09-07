import { DashboardPage } from "@/components/DashboardPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardRoute() {
  return <DashboardPage />;
}
