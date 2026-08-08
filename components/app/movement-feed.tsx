"use client";

import Link from "next/link";
import { formatRelative, formatSignedUnits } from "@/lib/format";
import type { Item, Movement, MovementType } from "@/lib/inventory/types";
import { cn } from "@/lib/cn";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  receipt: "Received",
  issue: "Picked",
  transfer: "Moved",
  adjustment: "Adjusted",
  count: "Counted",
};

export function MovementRows({
  movements,
  itemsById,
  now,
}: {
  movements: Movement[];
  itemsById: Map<string, Item>;
  now: number | null;
}) {
  return (
    <ul className="divide-y divide-line">
      {movements.map((movement) => {
        const item = itemsById.get(movement.itemId);
        return (
          <li key={movement.id}>
            <Link
              href={item ? `/app/items?focus=${encodeURIComponent(item.sku)}` : "/app/movements"}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-blue-50"
            >
              <span className="type-meta w-16 shrink-0 text-[0.625rem] text-ink-500">
                {MOVEMENT_LABEL[movement.type]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] text-ink-900">
                  {item?.name ?? "Deleted part"}
                </span>
                <span className="type-data block text-[0.6875rem] text-ink-500">
                  {movement.reference}
                  {movement.toBin || movement.fromBin
                    ? ` · ${movement.toBin ?? movement.fromBin}`
                    : ""}
                </span>
              </span>
              {movement.qty !== 0 && (
                <span
                  className={cn(
                    "type-data shrink-0 text-[0.8125rem]",
                    movement.qty > 0 ? "text-ok" : "text-ink-700",
                  )}
                  data-numeric
                >
                  {formatSignedUnits(movement.qty)}
                </span>
              )}
              <span className="w-16 shrink-0 text-right text-[0.75rem] text-ink-500">
                {now ? formatRelative(movement.at, now) : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
