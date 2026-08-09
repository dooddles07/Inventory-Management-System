"use client";

import { useState } from "react";
import { fillStep, type FloorAisle, type FloorCell } from "@/lib/inventory/floor";
import { formatUnits } from "@/lib/format";

/*
  The signature element. One cell per bin, brightness encodes how full the bin is,
  so the four brand blues do the data work instead of decorating the page.
*/

const RAMP = ["rgba(255,255,255,0.055)", "#1a63c0", "#2196f3", "#68b4f7", "#afd9fc"] as const;

const LEGEND = ["Empty", "", "", "", "Full"] as const;

interface FloorMapProps {
  floor: FloorAisle[];
  totalBins: number;
}

export function FloorMap({ floor, totalBins }: FloorMapProps) {
  const [active, setActive] = useState<FloorCell | null>(null);

  return (
    <div className="on-navy rounded-lg border border-[#1c5bb8] bg-navy-900 p-4 shadow-pop sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="type-label text-blue-300">Floor 1 &middot; live</p>
        <p className="type-data hidden text-on-navy-muted sm:block" data-numeric>
          6 aisles &middot; 48 racks
        </p>
      </div>

      <div className="space-y-1.5" aria-hidden="true">
        {floor.map((aisle, aisleIndex) => (
          <div key={aisle.aisle} className="flex items-center gap-2">
            <span className="type-label w-4 shrink-0 text-on-navy-muted">{aisle.aisle}</span>
            <div className="flex min-w-0 flex-1 gap-1.5">
              {aisle.racks.map((rack, rackIndex) => (
                <div key={rack.rack} className="flex min-w-0 flex-1 gap-px">
                  {rack.cells.map((cell, shelfIndex) => {
                    const step = fillStep(cell.fill);
                    return (
                      <div
                        key={cell.code}
                        className="bin-cell-in h-7 min-w-0 flex-1 rounded-[2px] transition-[transform,box-shadow] duration-150 hover:scale-y-110 sm:h-9"
                        style={{
                          background: RAMP[step],
                          boxShadow:
                            active?.code === cell.code
                              ? "0 0 0 1.5px #f2f7fd"
                              : step === 0
                                ? "inset 0 0 0 1px rgba(255,255,255,0.07)"
                                : undefined,
                          animationDelay: `${aisleIndex * 0.05 + rackIndex * 0.018 + shelfIndex * 0.006}s`,
                        }}
                        /*
                          A phone has no hover, so without the click the readout below
                          never fills - the one thing this element exists to do.

                          Enter and leave are gated on a real mouse because a tap also
                          emits them for compatibility, and the trailing mouseleave would
                          wipe the cell the tap had just chosen.
                        */
                        onPointerEnter={(event) => {
                          if (event.pointerType === "mouse") setActive(cell);
                        }}
                        onPointerLeave={(event) => {
                          if (event.pointerType === "mouse") setActive(null);
                        }}
                        onClick={() => setActive(cell)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed readout slot rather than a floating tooltip, so nothing reflows on hover. */}
      <div className="mt-4 flex min-h-[2.75rem] items-center justify-between gap-4 border-t border-[#1c5bb8] pt-3">
        {active ? (
          <>
            <div className="min-w-0">
              <p className="type-data text-on-navy">
                {active.code}
                {active.sku ? ` · ${active.sku}` : ""}
              </p>
              <p className="truncate text-[0.8125rem] text-on-navy-muted">
                {active.name ?? "Empty bin"}
              </p>
            </div>
            {active.qty !== null && (
              <p className="type-data shrink-0 text-blue-300" data-numeric>
                {formatUnits(active.qty)} on hand
              </p>
            )}
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-4">
            <p className="text-[0.8125rem] text-on-navy-muted">
              Pick a bin to see what is in it. {totalBins} bins across six aisles.
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {RAMP.map((color, index) => (
                <span key={color} className="flex items-center gap-1.5">
                  {LEGEND[index] && (
                    <span className="type-label text-[0.625rem] text-on-navy-muted">
                      {LEGEND[index]}
                    </span>
                  )}
                  <span
                    className="h-3 w-3 rounded-[2px]"
                    style={{
                      background: color,
                      boxShadow: index === 0 ? "inset 0 0 0 1px rgba(255,255,255,0.14)" : undefined,
                    }}
                  />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
