import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** One surface, hairline border, no nesting. Everything in the app sits in one of these. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-md border border-line bg-surface shadow-card", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h2 className="type-title text-[0.9375rem] text-ink-900">{title}</h2>
        {hint && <p className="mt-0.5 truncate text-[0.8125rem] text-ink-500">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xs bg-blue-100", className)} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="type-title text-[0.9375rem] text-ink-900">{title}</p>
      <p className="max-w-sm text-[0.875rem] leading-relaxed text-ink-500">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
