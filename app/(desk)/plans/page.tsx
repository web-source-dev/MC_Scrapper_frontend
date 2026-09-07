import { PlansPage } from "@/components/PlansPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plans",
};

export default function PlansRoute() {
  return <PlansPage />;
}
