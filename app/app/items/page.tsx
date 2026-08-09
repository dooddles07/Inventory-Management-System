import type { Metadata } from "next";
import { ItemsView } from "./items-view";

export const metadata: Metadata = {
  title: "Parts",
  description: "Search, filter and sort every part in the warehouse, and edit any of them.",
};

export default function ItemsPage() {
  return <ItemsView />;
}
