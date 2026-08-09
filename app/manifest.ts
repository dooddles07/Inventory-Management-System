import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stockroom - inventory tracking for small warehouses",
    short_name: "Stockroom",
    description:
      "Give every part a bin number, see what is running low, and find anything on the floor map.",
    start_url: "/app",
    display: "standalone",
    background_color: "#edf2f9",
    theme_color: "#0d47a1",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
