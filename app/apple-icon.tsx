import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const CELLS = ["#e3f2fd", "#2196f3", "#90caf9", "#2196f3", "#1a63c0", "#e3f2fd"];

/** iOS needs a raster icon, so the wordmark's six bins are redrawn here at touch size. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          gap: 8,
          padding: 28,
          background: "#0d47a1",
        }}
      >
        {CELLS.map((color, index) => (
          <div
            key={index}
            style={{ display: "flex", width: 36, height: 46, borderRadius: 5, background: color }}
          />
        ))}
      </div>
    ),
    size,
  );
}
