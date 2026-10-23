import { NewDotsPage } from "@/components/NewDotsPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New DOTs",
};

export default function NewDotsRoute() {
  return <NewDotsPage />;
}
