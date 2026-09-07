import { SearchTool } from "@/components/SearchTool";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
};

export default function SearchRoute() {
  return <SearchTool />;
}
