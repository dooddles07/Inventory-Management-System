import { ImageResponse } from "next/og";
import { buildFloor, fillStep } from "@/lib/inventory/floor";
import { createSeedSnapshot } from "@/lib/inventory/seed";

export const alt = "Stockroom - inventory tracking for small warehouses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Empty bins are lifted above the navy here: at card size an invisible cell breaks the grid.
const RAMP = ["rgba(255,255,255,0.14)", "#1a63c0", "#2196f3", "#68b4f7", "#afd9fc"];

// 48 cells per aisle have to clear 1200px minus the padding, so the cell is sized to fit.
const CELL_WIDTH = 17;
const CELL_GAP = 3;

/** The card shows the real floor map, on the same seed the site runs on. */
export default function OpengraphImage() {
  const cells = buildFloor(createSeedSnapshot().items).map((aisle) =>
    aisle.racks.flatMap((rack) => rack.cells.map((cell) => fillStep(cell.fill))),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d47a1",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: "0.18em",
              color: "#a9c6e8",
              textTransform: "uppercase",
            }}
          >
            Stockroom
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#f2f7fd",
            }}
          >
            Know what is in stock,
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#90caf9",
            }}
          >
            and where it is.
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: "#a9c6e8" }}>
            184 parts, 288 bins, one floor map.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cells.map((aisle, aisleIndex) => (
            <div key={aisleIndex} style={{ display: "flex", gap: CELL_GAP }}>
              {aisle.map((step, cellIndex) => (
                <div
                  key={cellIndex}
                  style={{
                    display: "flex",
                    width: CELL_WIDTH,
                    height: 30,
                    borderRadius: 2,
                    background: RAMP[step],
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
