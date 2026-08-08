import { cn } from "@/lib/cn";
import { STATUS_LABEL } from "@/lib/inventory/derive";
import type { StockStatus } from "@/lib/inventory/types";

const TONE: Record<StockStatus, { chip: string; dot: string }> = {
  ok: { chip: "bg-ok-wash text-ok", dot: "bg-ok" },
  low: { chip: "bg-low-wash text-low", dot: "bg-low" },
  out: { chip: "bg-out-wash text-out", dot: "bg-out" },
};

/** Colour is never the only signal: the label carries the meaning on its own. */
export function StatusPill({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span
      className={cn(
        "type-meta inline-flex items-center gap-1.5 rounded-xs px-1.5 py-1 text-[0.625rem]",
        TONE[status].chip,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", TONE[status].dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StatusDot({ status }: { status: StockStatus }) {
  return (
    <span
      title={STATUS_LABEL[status]}
      className={cn("h-2 w-2 shrink-0 rounded-full", TONE[status].dot)}
    >
      <span className="sr-only">{STATUS_LABEL[status]}</span>
    </span>
  );
}
