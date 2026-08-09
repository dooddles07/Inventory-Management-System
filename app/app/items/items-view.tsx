"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { ItemDrawer } from "@/components/app/item-drawer";
import { EmptyState, Panel, Skeleton } from "@/components/app/panel";
import { StatusPill } from "@/components/app/status-pill";
import { StockBar } from "@/components/app/stock-bar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/drawer";
import { Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatMoney, formatRelative, formatUnits } from "@/lib/format";
import { lineValue, statusOf } from "@/lib/inventory/derive";
import { CATEGORY_NAMES } from "@/lib/inventory/seed";
import { useDataTable, type SortKey, type StatusFilter } from "@/lib/hooks/use-data-table";
import { useNow } from "@/lib/hooks/use-now";
import { useInventory } from "@/lib/store/inventory-context";
import type { Item } from "@/lib/inventory/types";

const STATUS_VALUES: StatusFilter[] = ["all", "attention", "low", "out", "ok"];

/** A hand-typed query string should not be able to put the table into a filter that does not exist. */
function readStatus(value: string | null): StatusFilter {
  return STATUS_VALUES.find((status) => status === value) ?? "all";
}

const COLUMNS: Array<{ key: SortKey; label: string; className: string; numeric?: boolean }> = [
  { key: "name", label: "Part", className: "" },
  { key: "category", label: "Category", className: "hidden xl:table-cell" },
  { key: "bin", label: "Bin", className: "hidden sm:table-cell" },
  { key: "qty", label: "On hand", className: "", numeric: true },
  { key: "value", label: "Value", className: "hidden lg:table-cell", numeric: true },
  { key: "updatedAt", label: "Updated", className: "hidden xl:table-cell", numeric: true },
];

export function ItemsView() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ItemsTable />
    </Suspense>
  );
}

function ItemsTable() {
  const params = useSearchParams();
  const { snapshot, ready, deleteItems } = useInventory();
  const now = useNow();

  const table = useDataTable(snapshot.items, {
    status: readStatus(params.get("status")),
    supplierId: params.get("supplier") ?? "all",
    search: params.get("focus") ?? "",
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Item | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  // A search landing from elsewhere in the app opens straight onto the part it named.
  // Handled during render, once per SKU, so it does not need an effect to fire.
  const focusSku = params.get("focus");
  const [handledFocus, setHandledFocus] = useState<string | null>(null);
  if (ready && focusSku && focusSku !== handledFocus) {
    setHandledFocus(focusSku);
    const match = snapshot.items.find((item) => item.sku === focusSku);
    if (match) {
      setEditing(match);
      setMode("edit");
      setDrawerOpen(true);
    }
  }

  const pageIds = table.rows.map((row) => row.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditing(null);
    setMode("create");
    setDrawerOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setMode("edit");
    setDrawerOpen(true);
  }

  if (!ready) return <TableSkeleton />;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          type="search"
          value={table.filters.search}
          onChange={(event) => table.update({ search: event.target.value })}
          placeholder="Filter by name, SKU or bin"
          aria-label="Filter parts"
          className="h-9 w-full sm:w-64"
        />
        <Select
          value={table.filters.status}
          onChange={(event) => table.update({ status: event.target.value as StatusFilter })}
          aria-label="Filter by stock status"
          className="w-auto"
        >
          <option value="all">All stock levels</option>
          <option value="attention">Needs restocking</option>
          <option value="low">Below reorder</option>
          <option value="out">Out of stock</option>
          <option value="ok">In stock</option>
        </Select>
        <Select
          value={table.filters.category}
          onChange={(event) => table.update({ category: event.target.value })}
          aria-label="Filter by category"
          className="w-auto"
        >
          <option value="all">All categories</option>
          {CATEGORY_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          value={table.filters.supplierId}
          onChange={(event) => table.update({ supplierId: event.target.value })}
          aria-label="Filter by supplier"
          className="hidden w-auto lg:block"
        >
          <option value="all">All suppliers</option>
          {snapshot.suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </Select>

        {table.isFiltered && (
          <Button variant="ghost" size="sm" onClick={table.clear}>
            Clear filters
          </Button>
        )}

        <Button onClick={openCreate} className="ml-auto">
          <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
          Add part
        </Button>
      </div>

      {/*
        Filtering changes the table silently. This is the only feedback a screen reader
        gets, and it deliberately does not repeat the empty state's wording - hearing the
        same sentence twice is worse than hearing it once.
      */}
      <p aria-live="polite" className="sr-only">
        {table.total === 0 ? "No parts match." : `${formatUnits(table.total)} parts match.`}
      </p>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-sm border border-blue-500 bg-blue-50 px-4 py-2.5">
          <p className="text-[0.875rem] text-ink-900">
            <span data-numeric>{selected.size}</span> selected
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmBulk(true)}
            className="ml-auto text-out hover:bg-out-wash hover:text-out"
          >
            <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
            Delete selected
          </Button>
        </div>
      )}

      <Panel className="overflow-hidden">
        {table.total === 0 ? (
          <EmptyState
            title="No parts match these filters"
            body="Widen the search, or clear the filters to see all
              parts in the warehouse again."
            action={
              <Button variant="outline" onClick={table.clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse">
              <thead>
                <tr className="border-b border-line bg-paper">
                  <th scope="col" className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      aria-label="Select every part on this page"
                      className="size-3.5 cursor-pointer accent-navy-700"
                    />
                  </th>
                  {COLUMNS.map((column) => {
                    const active = table.sortKey === column.key;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={
                          active
                            ? table.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className={cn("px-3 py-2.5", column.className)}
                      >
                        <button
                          type="button"
                          onClick={() => table.toggleSort(column.key)}
                          className={cn(
                            "type-meta flex cursor-pointer items-center gap-1 text-[0.625rem] transition-colors duration-150 hover:text-ink-900",
                            column.numeric && "ml-auto",
                            active ? "text-ink-900" : "text-ink-500",
                          )}
                        >
                          {column.label}
                          {active &&
                            (table.direction === "asc" ? (
                              <ArrowUp size={12} strokeWidth={2.4} aria-hidden="true" />
                            ) : (
                              <ArrowDown size={12} strokeWidth={2.4} aria-hidden="true" />
                            ))}
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="px-3 py-2.5 text-right">
                    <span className="type-meta text-[0.625rem] text-ink-500">Status</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {table.rows.map((item) => {
                  const status = statusOf(item);
                  const isSelected = selected.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "transition-colors duration-150",
                        isSelected ? "bg-blue-50" : "hover:bg-blue-50",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="size-3.5 cursor-pointer accent-navy-700"
                        />
                      </td>

                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="cursor-pointer text-left"
                        >
                          <span className="block text-[0.875rem] text-ink-900 hover:text-blue-700">
                            {item.name}
                          </span>
                          <span className="type-data block text-[0.6875rem] text-ink-500">
                            {item.sku}
                          </span>
                        </button>
                      </td>

                      <td className="hidden px-3 py-2.5 text-[0.8125rem] text-ink-700 xl:table-cell">
                        {item.category}
                      </td>

                      <td className="type-data hidden px-3 py-2.5 text-[0.8125rem] text-ink-700 sm:table-cell">
                        {item.bin}
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className="type-data block text-right text-[0.875rem] text-ink-900"
                          data-numeric
                        >
                          {formatUnits(item.qty)}
                          <span className="ml-1 text-[0.75rem] text-ink-500">{item.uom}</span>
                        </span>
                        <StockBar item={item} className="mt-1 ml-auto w-20" />
                      </td>

                      <td
                        className="type-data hidden px-3 py-2.5 text-right text-[0.8125rem] text-ink-700 lg:table-cell"
                        data-numeric
                      >
                        {formatMoney(lineValue(item))}
                      </td>

                      <td className="hidden px-3 py-2.5 text-right text-[0.75rem] text-ink-500 xl:table-cell">
                        {now ? formatRelative(item.updatedAt, now) : ""}
                      </td>

                      <td className="px-3 py-2.5 text-right">
                        <StatusPill status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {table.total > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5">
            <p className="text-[0.8125rem] text-ink-500">
              <span data-numeric>
                {table.page * table.pageSize + 1}-
                {Math.min((table.page + 1) * table.pageSize, table.total)}
              </span>{" "}
              of <span data-numeric>{formatUnits(table.total)}</span> parts
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPage(table.page - 1)}
                disabled={table.page === 0}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} strokeWidth={2} aria-hidden="true" />
              </Button>
              <span className="type-data px-2 text-[0.75rem] text-ink-500" data-numeric>
                {table.page + 1} / {table.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPage(table.page + 1)}
                disabled={table.page >= table.pageCount - 1}
                aria-label="Next page"
              >
                <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <ItemDrawer item={editing} mode={mode} open={drawerOpen} onOpenChange={setDrawerOpen} />

      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        title={selected.size === 1 ? "Delete this part?" : `Delete ${selected.size} parts?`}
        body={
          selected.size === 1
            ? "The part and its movement history are removed from this browser. Reset the sample data to bring everything back."
            : "These parts and their movement history are removed from this browser. Reset the sample data to bring everything back."
        }
        confirmLabel={selected.size === 1 ? "Delete part" : "Delete parts"}
        onConfirm={() => {
          void deleteItems([...selected]);
          setSelected(new Set());
        }}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Panel className="p-4">
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </Panel>
    </div>
  );
}
