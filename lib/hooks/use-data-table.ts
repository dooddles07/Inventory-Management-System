"use client";

import { useMemo, useState } from "react";
import { lineValue, statusOf } from "@/lib/inventory/derive";
import type { Item, StockStatus } from "@/lib/inventory/types";

export type SortKey = "name" | "sku" | "category" | "qty" | "value" | "bin" | "updatedAt";
export type SortDirection = "asc" | "desc";
export type StatusFilter = "all" | StockStatus | "attention";

export interface TableFilters {
  search: string;
  category: string;
  supplierId: string;
  status: StatusFilter;
}

const PAGE_SIZE = 25;

const EMPTY_FILTERS: TableFilters = {
  search: "",
  category: "all",
  supplierId: "all",
  status: "all",
};

/** Exported for the test suite: the hook itself is the only caller in the app. */
export function compare(a: Item, b: Item, key: SortKey): number {
  switch (key) {
    case "qty":
      return a.qty - b.qty;
    case "value":
      return lineValue(a) - lineValue(b);
    case "updatedAt":
      return a.updatedAt.localeCompare(b.updatedAt);
    case "sku":
      return a.sku.localeCompare(b.sku);
    case "bin":
      return a.bin.localeCompare(b.bin);
    case "category":
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    default:
      return a.name.localeCompare(b.name);
  }
}

/** Exported for the test suite: the hook itself is the only caller in the app. */
export function matches(item: Item, filters: TableFilters): boolean {
  const term = filters.search.trim().toLowerCase();
  if (term) {
    const haystack = `${item.sku} ${item.name} ${item.bin} ${item.category}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  if (filters.category !== "all" && item.category !== filters.category) return false;
  if (filters.supplierId !== "all" && item.supplierId !== filters.supplierId) return false;

  if (filters.status !== "all") {
    const status = statusOf(item);
    if (filters.status === "attention" ? status === "ok" : status !== filters.status) return false;
  }
  return true;
}

/**
 * Search, filter, sort and paginate over the part list.
 * A table library would be a dependency for what useMemo already does at this size.
 */
export function useDataTable(items: Item[], initial?: Partial<TableFilters>) {
  const [filters, setFilters] = useState<TableFilters>({ ...EMPTY_FILTERS, ...initial });
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => items.filter((item) => matches(item, filters)), [items, filters]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => (direction === "asc" ? compare(a, b, sortKey) : compare(b, a, sortKey)));
    return rows;
  }, [filtered, sortKey, direction]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = useMemo(
    () => sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [sorted, safePage],
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Quantities, value and dates are most useful largest-first on the first click.
      setDirection(key === "qty" || key === "value" || key === "updatedAt" ? "desc" : "asc");
    }
    setPage(0);
  }

  function update(patch: Partial<TableFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  }

  function clear() {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }

  const isFiltered =
    filters.search.trim() !== "" ||
    filters.category !== "all" ||
    filters.supplierId !== "all" ||
    filters.status !== "all";

  return {
    filters,
    update,
    clear,
    isFiltered,
    rows,
    total: sorted.length,
    sortKey,
    direction,
    toggleSort,
    page: safePage,
    pageCount,
    pageSize: PAGE_SIZE,
    setPage,
  };
}
