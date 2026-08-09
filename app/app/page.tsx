import type { Metadata } from "next";
import { OverviewView } from "./overview-view";

// Each route keeps its own title here: the views are client components and cannot export metadata.
export const metadata: Metadata = {
  title: "Overview",
  description: "Stock value, what needs restocking, and the last movements on the floor.",
};

export default function OverviewPage() {
  return <OverviewView />;
}
