import type { Metadata } from "next";
import { SuppliersView } from "./suppliers-view";

export const metadata: Metadata = {
  title: "Suppliers",
  description: "Lead times, what each supplier covers, and how much of it needs restocking.",
};

export default function SuppliersPage() {
  return <SuppliersView />;
}
