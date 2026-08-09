"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Panel, PanelHeader, Skeleton } from "@/components/app/panel";
import { cn } from "@/lib/cn";
import { formatMoney, formatUnits } from "@/lib/format";
import { lineValue, statusOf } from "@/lib/inventory/derive";
import { useInventory } from "@/lib/store/inventory-context";

interface SupplierRow {
  id: string;
  name: string;
  code: string;
  country: string;
  contact: string;
  leadTimeDays: number;
  parts: number;
  value: number;
  needsRestock: number;
}

export function SuppliersView() {
  const { snapshot, ready } = useInventory();

  const rows = useMemo<SupplierRow[]>(() => {
    return snapshot.suppliers
      .map((supplier) => {
        const parts = snapshot.items.filter((item) => item.supplierId === supplier.id);
        return {
          ...supplier,
          parts: parts.length,
          value: parts.reduce((sum, item) => sum + lineValue(item), 0),
          needsRestock: parts.filter((item) => statusOf(item) !== "ok").length,
        };
      })
      .sort((a, b) => b.needsRestock - a.needsRestock || b.value - a.value);
  }, [snapshot.items, snapshot.suppliers]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Panel className="p-4">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  const slowest = Math.max(...rows.map((row) => row.leadTimeDays), 1);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <Panel className="overflow-hidden">
        <PanelHeader
          title="Suppliers"
          hint="Ordered by how many of their parts need restocking"
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper">
                {["Supplier", "Lead time", "Parts", "Need restocking", "Stock value"].map(
                  (label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={cn(
                        "type-meta px-3 py-2.5 text-[0.625rem] text-ink-500",
                        index >= 2 ? "text-right" : "text-left",
                      )}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors duration-150 hover:bg-blue-50">
                  <td className="px-3 py-3">
                    <span className="block text-[0.875rem] text-ink-900">{row.name}</span>
                    <span className="type-data block text-[0.6875rem] text-ink-500">
                      {row.code} &middot; {row.country} &middot; {row.contact}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    {/* The bar is relative to the slowest supplier, so the comparison is the point. */}
                    <div className="flex items-center gap-2">
                      <span className="type-data w-14 shrink-0 text-[0.8125rem] text-ink-900" data-numeric>
                        {row.leadTimeDays} days
                      </span>
                      <span className="h-1.5 w-20 overflow-hidden rounded-xs bg-blue-100">
                        <span
                          className="block h-full rounded-xs bg-blue-500"
                          style={{ width: `${(row.leadTimeDays / slowest) * 100}%` }}
                        />
                      </span>
                    </div>
                  </td>

                  <td className="type-data px-3 py-3 text-right text-[0.8125rem] text-ink-700" data-numeric>
                    {formatUnits(row.parts)}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {row.needsRestock > 0 ? (
                      <Link
                        href={`/app/items?status=attention&supplier=${row.id}`}
                        aria-label={`Show the ${row.needsRestock} parts from ${row.name} that need restocking`}
                        className="type-data text-[0.8125rem] text-low hover:underline"
                        data-numeric
                      >
                        {formatUnits(row.needsRestock)}
                      </Link>
                    ) : (
                      <span className="type-data text-[0.8125rem] text-ink-500">0</span>
                    )}
                  </td>

                  <td className="type-data px-3 py-3 text-right text-[0.8125rem] text-ink-900" data-numeric>
                    {formatMoney(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
