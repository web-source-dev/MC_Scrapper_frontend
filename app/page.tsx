import { LandingPage } from "@/components/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MC Finder · Find authorized carriers",
  description:
    "Dispatcher desk for SAFER-active USA carriers. Search by MC, USDOT, company, location, or phone. Start free with 1,000 MCs/day.",
};

export default function HomePage() {
  return <LandingPage />;
}
