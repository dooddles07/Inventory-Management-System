"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { EmptyState, Panel, PanelHeader, Skeleton } from "@/components/app/panel";
import { MovementRows } from "@/components/app/movement-feed";
import { StatusDot } from "@/components/app/status-pill";
import { StockBar } from "@/components/app/stock-bar";
import { ThroughputChart } from "@/components/app/throughput-chart";
import { Ticker } from "@/components/motion/ticker";
import { formatCompactMoney, formatUnits } from "@/lib/format";
import { reorderQueue, throughputSeries, totals } from "@/lib/inventory/derive";
import { useNow } from "@/lib/hooks/use-now";
import { useInventory } from "@/lib/store/inventory-context";

const TREND_DAYS = 30;

export default function OverviewPage() {
  const { snapshot, ready } = useInventory();
  const now = useNow();

  const summary = useMemo(() => totals(snapshot.items), [snapshot.items]);
  const queue = useMemo(
    () => reorderQueue(snapshot.items, snapshot.suppliers, 8),
    [snapshot.items, snapshot.suppliers],
  );
  const itemsById = useMemo(
    () => new Map(snapshot.items.map((item) => [item.id, item])),
    [snapshot.items],
  );
  // Date.now() during render is impure; the window only exists once the clock has started.
  const series = useMemo(
    () => (now === null ? [] : throughputSeries(snapshot.movements, TREND_DAYS, now)),
    [snapshot.movements, now],
  );

  if (!ready) return <OverviewSkeleton />;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <Panel>
        <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          <Readout label="Stock value">
            <Ticker value={summary.stockValue} format={formatCompactMoney} />
          </Readout>
          <Readout label="Units on hand">
            <Ticker value={summary.unitsOnHand} format={formatUnits} />
          </Readout>
          <Readout label="Need restocking" tone={summary.low + summary.out > 0 ? "low" : undefined}>
            <Ticker value={summary.low + summary.out} format={formatUnits} />
          </Readout>
          <Readout label="Out of stock" tone={summary.out > 0 ? "out" : undefined}>
            <Ticker value={summary.out} format={formatUnits} />
          </Readout>
        </dl>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Panel>
          <PanelHeader
            title="Needs restocking"
            hint="Ranked by how much is missing and how long the supplier takes"
            action={
              <Link
                href="/app/items?status=attention"
                className="inline-flex items-center gap-1 rounded-xs text-[0.8125rem] text-blue-700 transition-colors duration-150 hover:text-navy-700"
              >
                See all {formatUnits(summary.low + summary.out)}
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            }
          />

          {queue.length === 0 ? (
            <EmptyState
              title="Everything is above its reorder point"
              body="When a part drops to its reorder point it appears here, worst first, with the supplier lead time so you know how long a restock takes."
            />
          ) : (
            <ul className="divide-y divide-line">
              {queue.map(({ item, supplier, shortfall, coverDays }) => (
                <li key={item.id}>
                  <Link
                    href={`/app/items?focus=${encodeURIComponent(item.sku)}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-blue-50"
                  >
                    <StatusDot status={item.qty <= 0 ? "out" : "low"} />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] text-ink-900">
                        {item.name}
                      </span>
                      <span className="type-data block text-[0.6875rem] text-ink-500">
                        {item.sku} &middot; {item.bin}
                      </span>
                      <StockBar item={item} className="mt-1.5 max-w-44" />
                    </span>

                    <span className="w-24 shrink-0 text-right sm:w-32">
                      <span className="type-data block text-[0.8125rem] text-ink-900" data-numeric>
                        {formatUnits(item.qty)} left
                      </span>
                      <span className="block text-[0.75rem] text-ink-500">
                        order {formatUnits(shortfall)} {item.uom}
                      </span>
                    </span>

                    <span className="hidden w-36 shrink-0 text-right lg:block">
                      <span className="block truncate text-[0.8125rem] text-ink-700">
                        {supplier?.name ?? "No supplier"}
                      </span>
                      <span className="block text-[0.75rem] text-ink-500">
                        {coverDays === null ? "lead time unknown" : `${coverDays} day lead time`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Throughput" hint="Everything received, picked and adjusted" />
            <div className="px-4 py-4">
              <ThroughputChart series={series} days={TREND_DAYS} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Latest activity"
              action={
                <Link
                  href="/app/movements"
                  className="rounded-xs text-[0.8125rem] text-blue-700 transition-colors duration-150 hover:text-navy-700"
                >
                  See all
                </Link>
              }
            />
            {snapshot.movements.length === 0 ? (
              <EmptyState
                title="No movements yet"
                body="Receiving stock, picking it, or correcting a count all show up here with a reference you can trace."
              />
            ) : (
              <MovementRows
                movements={snapshot.movements.slice(0, 7)}
                itemsById={itemsById}
                now={now}
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Readout({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "low" | "out";
}) {
  const color = tone === "out" ? "text-out" : tone === "low" ? "text-low" : "text-ink-900";
  return (
    <div className="border-b border-line px-4 py-3 last:border-b-0 sm:border-b-0">
      <dt className="type-meta text-[0.625rem] text-ink-500">{label}</dt>
      <dd className={`type-data mt-1 text-[1.5rem] ${color}`}>{children}</dd>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <Panel>
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2 px-4 py-3">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Panel className="p-4">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel className="p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-24 w-full" />
          </Panel>
          <Panel className="p-4">
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
