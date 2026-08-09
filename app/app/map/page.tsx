import type { Metadata } from "next";
import { MapView } from "./map-view";

export const metadata: Metadata = {
  title: "Floor map",
  description: "Every bin in the building, coloured by how full it is or what needs restocking.",
};

export default function FloorMapPage() {
  return <MapView />;
}
