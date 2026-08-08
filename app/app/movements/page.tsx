"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, Panel, PanelHeader, Skeleton } from "@/components/app/panel";
import { MOVEMENT_LABEL } from "@/components/app/movement-feed";
import { Button } from "@/components/ui/button";
import { Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative, formatSignedUnits, formatUnits } from "@/lib/format";
import type { MovementType } from "@/lib/inventory/types";
import { useNow } from "@/lib/hooks/use-now";
import { useInventory } from "@/lib/store/inventory-context";

const TYPES: MovementType[] = ["receipt", "issue", "transfer", "adjustment", "count"];
const PAGE_SIZE = 40;

export default function MovementsPage() {
  const { snapshot, ready } = useInventory();
  const now = useNow();
  const [type, setType] = useState<MovementType | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const itemsById = useMemo(
    () => new Map(snapshot.items.map((item) => [item.id, item])),
    [snapshot.items],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return snapshot.movements.filter((movement) => {
      if (type !== "all" && movement.type !== type) return false;
      if (!term) return true;
      const item = itemsById.get(movement.itemId);
      return `${movement.reference} ${movement.by} ${item?.name ?? ""} ${item?.sku ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [snapshot.movements, type, search, itemsById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <Panel className="p-4">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          placeholder="Filter by reference, part or person"
          aria-label="Filter movements"
          className="h-9 w-full sm:w-72"
        />
        <Select
          value={type}
          onChange={(event) => {
            setType(event.target.value as MovementType | "all");
            setPage(0);
          }}
          aria-label="Filter by movement type"
          className="w-auto"
        >
          <option value="all">Every kind</option>
          {TYPES.map((option) => (
            <option key={option} value={option}>
              {MOVEMENT_LABEL[option]}
            </option>
          ))}
        </Select>
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          title="Movement log"
          hint={`${formatUnits(filtered.length)} entries, newest first`}
        />

        {rows.length === 0 ? (
          <EmptyState
            title="No movements match"
            body="Every receipt, pick, transfer, correction and cycle count lands here with a reference you can trace back."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setType("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse">
              <thead>
                <tr className="border-b border-line bg-paper">
                  {["Kind", "Part", "Reference", "Change", "Who", "When"].map((label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={cn(
                        "type-meta px-3 py-2.5 text-[0.625rem] text-ink-500",
                        index >= 3 ? "text-right" : "text-left",
                        index === 4 && "hidden sm:table-cell",
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((movement) => {
                  const item = itemsById.get(movement.itemId);
                  return (
                    <tr key={movement.id} className="transition-colors duration-150 hover:bg-blue-50">
                      <td className="px-3 py-2.5">
                        <span className="type-meta text-[0.625rem] text-ink-700">
                          {MOVEMENT_LABEL[movement.type]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {item ? (
                          <Link
                            href={`/app/items?focus=${encodeURIComponent(item.sku)}`}
                            className="text-[0.8125rem] text-ink-900 hover:text-blue-700"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <span className="text-[0.8125rem] text-ink-500">Deleted part</span>
                        )}
                      </td>
                      <td className="type-data px-3 py-2.5 text-[0.75rem] text-ink-500">
                        {movement.reference}
                        {movement.fromBin && movement.toBin && (
                          <span className="ml-1.5 text-ink-700">
                            {movement.fromBin} &rarr; {movement.toBin}
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "type-data px-3 py-2.5 text-right text-[0.8125rem]",
                          movement.qty > 0 ? "text-ok" : movement.qty < 0 ? "text-ink-900" : "text-ink-500",
                        )}
                        data-numeric
                      >
                        {movement.qty === 0 ? "no change" : formatSignedUnits(movement.qty)}
                      </td>
                      <td className="hidden px-3 py-2.5 text-right text-[0.8125rem] text-ink-700 sm:table-cell">
                        {movement.by}
                      </td>
                      <td
                        className="px-3 py-2.5 text-right text-[0.75rem] text-ink-500"
                        title={formatDate(movement.at)}
                      >
                        {now ? formatRelative(movement.at, now) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5">
            <p className="text-[0.8125rem] text-ink-500" data-numeric>
              Page {safePage + 1} of {pageCount}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
