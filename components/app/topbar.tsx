"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { statusOf } from "@/lib/inventory/derive";
import { formatUnits } from "@/lib/format";
import { useInventory } from "@/lib/store/inventory-context";
import { titleFor } from "./nav-config";
import { StatusDot } from "./status-pill";

const MAX_RESULTS = 6;

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { snapshot, resetToSeed } = useInventory();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return snapshot.items
      .filter(
        (item) =>
          item.sku.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term) ||
          item.bin.toLowerCase().includes(term),
      )
      .slice(0, MAX_RESULTS);
  }, [query, snapshot.items]);

  // Results can shrink under a stale highlight, so clamp rather than reset from an effect.
  const active = Math.min(highlight, Math.max(results.length - 1, 0));

  // Slash focuses search, the way every tool with a search field behaves.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(sku: string) {
    setOpen(false);
    setQuery("");
    router.push(`/app/items?focus=${encodeURIComponent(sku)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % results.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => (index - 1 + results.length) % results.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      go(results[active].sku);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <h1 className="type-title shrink-0 text-[1.0625rem] text-ink-900">{titleFor(pathname)}</h1>

      <div ref={boxRef} className="relative ml-auto w-full max-w-sm">
        <Search
          size={15}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-500"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search parts, SKUs, bins"
          aria-label="Search parts, SKUs and bins"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="topbar-search-results"
          className="h-9 w-full rounded-sm border border-line-strong bg-paper pr-8 pl-8 text-[0.875rem] text-ink-900 transition-colors duration-150 outline-none placeholder:text-ink-500 hover:border-line-strong focus:border-blue-500 focus:bg-surface"
        />
        <kbd className="type-data pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-xs border border-line-strong px-1 text-[0.6875rem] text-ink-500 sm:block">
          /
        </kbd>

        {open && query.trim().length >= 2 && (
          <div
            id="topbar-search-results"
            role="listbox"
            className="absolute top-11 right-0 left-0 z-30 overflow-hidden rounded-sm border border-line bg-surface shadow-pop"
          >
            {results.length === 0 ? (
              <p className="px-3 py-3 text-[0.8125rem] text-ink-500">
                Nothing matches &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : (
              results.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => go(item.sku)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors duration-150",
                    index === active ? "bg-blue-100" : "bg-surface",
                  )}
                >
                  <StatusDot status={statusOf(item)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] text-ink-900">{item.name}</span>
                    <span className="type-data block text-[0.6875rem] text-ink-500">
                      {item.sku} &middot; {item.bin}
                    </span>
                  </span>
                  <span className="type-data shrink-0 text-[0.75rem] text-ink-700" data-numeric>
                    {formatUnits(item.qty)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (window.confirm("Reset all parts and movements back to the sample data?")) {
            void resetToSeed();
          }
        }}
        title="Restore the sample warehouse"
        className="shrink-0"
      >
        <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
        <span className="hidden sm:inline">Reset data</span>
      </Button>
    </header>
  );
}
