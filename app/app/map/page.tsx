"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, Panel, PanelHeader, Skeleton } from "@/components/app/panel";
import { StatusPill } from "@/components/app/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { MOVEMENT_LABEL } from "@/components/app/movement-feed";
import { describeBin, formatMoney, formatSignedUnits, formatUnits } from "@/lib/format";
import { buildFloor, fillStep, type FloorCell } from "@/lib/inventory/floor";
import { lineValue, statusOf } from "@/lib/inventory/derive";
import { useInventory } from "@/lib/store/inventory-context";

type View = "fill" | "status";

const FILL_RAMP = ["#f2f8fe", "#c5e0fa", "#90caf9", "#2196f3", "#0d47a1"] as const;

const STATUS_COLOR: Record<string, string> = {
  ok: "var(--color-ok)",
  low: "var(--color-low)",
  out: "var(--color-out)",
};

export default function FloorMapPage() {
  const { snapshot, ready } = useInventory();
  const [view, setView] = useState<View>("fill");
  const [active, setActive] = useState<{ aisle: number; rack: number; shelf: number }>({
    aisle: 0,
    rack: 0,
    shelf: 0,
  });
  const gridRef = useRef<HTMLDivElement>(null);

  const floor = useMemo(() => buildFloor(snapshot.items), [snapshot.items]);
  const itemsBySku = useMemo(
    () => new Map(snapshot.items.map((item) => [item.sku, item])),
    [snapshot.items],
  );

  const activeCell: FloorCell | null =
    floor[active.aisle]?.racks[active.rack]?.cells[active.shelf] ?? null;
  const activeItem = activeCell?.sku ? (itemsBySku.get(activeCell.sku) ?? null) : null;

  // Land on a bin that holds something, so the panel opens with content rather than a blank.
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current || floor.length === 0) return;
    for (let aisle = 0; aisle < floor.length; aisle += 1) {
      for (let rack = 0; rack < floor[aisle].racks.length; rack += 1) {
        const shelf = floor[aisle].racks[rack].cells.findIndex((cell) => cell.sku);
        if (shelf !== -1) {
          settled.current = true;
          setActive({ aisle, rack, shelf });
          return;
        }
      }
    }
  }, [floor]);

  const recent = useMemo(() => {
    if (!activeItem) return [];
    return snapshot.movements.filter((movement) => movement.itemId === activeItem.id).slice(0, 4);
  }, [activeItem, snapshot.movements]);

  const { occupied, totalBins } = useMemo(() => {
    const cells = floor.flatMap((a) => a.racks.flatMap((r) => r.cells));
    return { occupied: cells.filter((cell) => cell.sku).length, totalBins: cells.length };
  }, [floor]);

  /** Arrow keys walk the racks. Only the active cell is tabbable, so the grid is one tab stop. */
  function onKeyDown(event: React.KeyboardEvent) {
    const shelves = floor[0]?.racks[0]?.cells.length ?? 1;
    const racks = floor[0]?.racks.length ?? 1;
    const aisles = floor.length;
    let { aisle, rack, shelf } = active;

    switch (event.key) {
      case "ArrowRight":
        shelf += 1;
        if (shelf >= shelves) {
          shelf = 0;
          rack = Math.min(rack + 1, racks - 1);
        }
        break;
      case "ArrowLeft":
        shelf -= 1;
        if (shelf < 0) {
          shelf = shelves - 1;
          rack = Math.max(rack - 1, 0);
        }
        break;
      case "ArrowDown":
        aisle = Math.min(aisle + 1, aisles - 1);
        break;
      case "ArrowUp":
        aisle = Math.max(aisle - 1, 0);
        break;
      case "Home":
        rack = 0;
        shelf = 0;
        break;
      case "End":
        rack = racks - 1;
        shelf = shelves - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActive({ aisle, rack, shelf });
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-cell="${aisle}-${rack}-${shelf}"]`)
        ?.focus();
    });
  }

  function colorFor(cell: FloorCell): string {
    if (view === "status") {
      return cell.status ? STATUS_COLOR[cell.status] : "var(--color-blue-50)";
    }
    return FILL_RAMP[fillStep(cell.fill)];
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <Panel className="p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-72 w-full" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <PanelHeader
            title="Floor 1"
            hint={`${formatUnits(occupied)} of ${formatUnits(totalBins)} bins hold stock`}
            action={
              <div
                role="radiogroup"
                aria-label="Colour the map by"
                className="flex rounded-sm border border-line-strong p-0.5"
              >
                {(["fill", "status"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={view === option}
                    onClick={() => setView(option)}
                    className={cn(
                      "cursor-pointer rounded-xs px-2.5 py-1 text-[0.75rem] font-medium capitalize transition-colors duration-150",
                      view === option
                        ? "bg-navy-700 text-white"
                        : "text-ink-500 hover:text-ink-900",
                    )}
                  >
                    {option === "fill" ? "How full" : "Stock status"}
                  </button>
                ))}
              </div>
            }
          />

          <div className="p-4">
            <div
              ref={gridRef}
              role="grid"
              aria-label="Warehouse bins by aisle, rack and shelf"
              onKeyDown={onKeyDown}
              className="space-y-2"
            >
              {floor.map((aisle, aisleIndex) => {
                const cells = aisle.racks.flatMap((rack) => rack.cells);
                const filled = cells.filter((cell) => cell.sku).length;
                return (
                <div key={aisle.aisle} role="row" className="flex items-center gap-2">
                  <span className="type-label w-4 shrink-0 text-ink-500">{aisle.aisle}</span>
                  <div className="flex min-w-0 flex-1 gap-1.5">
                    {aisle.racks.map((rack, rackIndex) => (
                      <div key={rack.rack} className="flex min-w-0 flex-1 gap-px">
                        {rack.cells.map((cell, shelfIndex) => {
                          const isActive =
                            active.aisle === aisleIndex &&
                            active.rack === rackIndex &&
                            active.shelf === shelfIndex;
                          return (
                            <button
                              key={cell.code}
                              type="button"
                              role="gridcell"
                              data-cell={`${aisleIndex}-${rackIndex}-${shelfIndex}`}
                              tabIndex={isActive ? 0 : -1}
                              aria-label={`${cell.code}. ${
                                cell.name ? `${cell.name}, ${cell.qty} on hand` : "Empty"
                              }`}
                              aria-selected={isActive}
                              onFocus={() =>
                                setActive({
                                  aisle: aisleIndex,
                                  rack: rackIndex,
                                  shelf: shelfIndex,
                                })
                              }
                              onMouseEnter={() =>
                                setActive({
                                  aisle: aisleIndex,
                                  rack: rackIndex,
                                  shelf: shelfIndex,
                                })
                              }
                              className={cn(
                                "h-9 min-w-0 flex-1 cursor-pointer rounded-[2px] transition-transform duration-150 hover:scale-y-110 sm:h-12 lg:h-14",
                                isActive && "ring-2 ring-ink-900 ring-offset-1",
                              )}
                              style={{
                                background: colorFor(cell),
                                boxShadow: cell.sku
                                  ? undefined
                                  : "inset 0 0 0 1px var(--color-line)",
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <span
                    className="type-data hidden w-12 shrink-0 text-right text-[0.6875rem] text-ink-500 sm:block"
                    data-numeric
                  >
                    {filled}/{cells.length}
                  </span>
                </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
              {view === "fill" ? (
                <div className="flex items-center gap-1.5">
                  <span className="type-meta text-[0.625rem] text-ink-500">Empty</span>
                  {FILL_RAMP.map((color) => (
                    <span
                      key={color}
                      className="h-3 w-5 rounded-[2px]"
                      style={{ background: color, boxShadow: "inset 0 0 0 1px var(--color-line)" }}
                    />
                  ))}
                  <span className="type-meta text-[0.625rem] text-ink-500">Full</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {(
                    [
                      ["ok", "In stock"],
                      ["low", "Below reorder"],
                      ["out", "Out of stock"],
                    ] as const
                  ).map(([key, label]) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <span
                        className="h-3 w-3 rounded-[2px]"
                        style={{ background: STATUS_COLOR[key] }}
                      />
                      <span className="text-[0.75rem] text-ink-500">{label}</span>
                    </span>
                  ))}
                </div>
              )}
              <p className="ml-auto text-[0.75rem] text-ink-500">
                Arrow keys walk the racks
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="h-fit lg:sticky lg:top-0">
          <PanelHeader title={activeCell?.code ?? "No bin"} hint={activeCell ? describeBin(activeCell.code) : undefined} />
          {activeItem ? (
            <div className="space-y-3 p-4">
              <div>
                <p className="text-[0.9375rem] text-ink-900">{activeItem.name}</p>
                <p className="type-data mt-0.5 text-[0.75rem] text-ink-500">{activeItem.sku}</p>
              </div>
              <StatusPill status={statusOf(activeItem)} />
              <dl className="space-y-1.5 border-t border-line pt-3 text-[0.8125rem]">
                <Row label="On hand" value={`${formatUnits(activeItem.qty)} ${activeItem.uom}`} />
                <Row label="Reorder at" value={formatUnits(activeItem.reorderPoint)} />
                <Row label="Value" value={formatMoney(lineValue(activeItem))} />
                <Row label="Category" value={activeItem.category} />
              </dl>
              <ButtonLink
                href={`/app/items?focus=${encodeURIComponent(activeItem.sku)}`}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Open this part
              </ButtonLink>

              {recent.length > 0 && (
                <div className="border-t border-line pt-3">
                  <p className="type-meta mb-2 text-[0.625rem] text-ink-500">Last touched</p>
                  <ul className="space-y-1.5">
                    {recent.map((movement) => (
                      <li
                        key={movement.id}
                        className="flex items-baseline justify-between gap-2 text-[0.75rem]"
                      >
                        <span className="text-ink-700">{MOVEMENT_LABEL[movement.type]}</span>
                        <span className="type-data text-ink-500">{movement.reference}</span>
                        <span
                          className={cn(
                            "type-data shrink-0",
                            movement.qty > 0 ? "text-ok" : "text-ink-900",
                          )}
                          data-numeric
                        >
                          {movement.qty === 0 ? "-" : formatSignedUnits(movement.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="This bin is empty"
              body="Assign a part to it by editing the part and setting its bin to this address."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="type-data text-ink-900" data-numeric>
        {value}
      </dd>
    </div>
  );
}
