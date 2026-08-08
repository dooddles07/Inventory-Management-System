"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fillRatio, statusOf } from "@/lib/inventory/derive";
import type { Item } from "@/lib/inventory/types";

const FILL: Record<string, string> = {
  ok: "var(--color-blue-500)",
  low: "var(--color-low)",
  out: "var(--color-out)",
};

/**
 * Quantity against a full bin, with the reorder point marked.
 * The tick is what makes the bar readable: without it a bar is just decoration.
 */
export function StockBar({ item, className }: { item: Item; className?: string }) {
  const reduced = useReducedMotion();
  const status = statusOf(item);
  const ratio = fillRatio(item);
  const reorderAt = Math.min(1, item.reorderPoint / Math.max(item.reorderPoint * 6, 1));

  return (
    <div
      className={className}
      role="img"
      aria-label={`${item.qty} on hand, reorder at ${item.reorderPoint}`}
    >
      <div className="relative h-1.5 w-full overflow-hidden rounded-xs bg-blue-100">
        <motion.span
          className="absolute inset-y-0 left-0 rounded-xs"
          style={{ background: FILL[status] }}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${Math.max(ratio * 100, item.qty > 0 ? 2 : 0)}%` }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 32 }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-ink-300"
          style={{ left: `${reorderAt * 100}%` }}
        />
      </div>
    </div>
  );
}
