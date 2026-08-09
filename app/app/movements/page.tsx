import type { Metadata } from "next";
import { MovementsView } from "./movements-view";

export const metadata: Metadata = {
  title: "Movements",
  description: "Every receipt, pick, transfer, correction and cycle count, newest first.",
};

export default function MovementsPage() {
  return <MovementsView />;
}
