import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "h-9 w-full rounded-sm border border-line-strong bg-surface px-2.5 text-[0.875rem] text-ink-900 " +
  "transition-colors duration-150 outline-none placeholder:text-ink-500 " +
  "hover:border-ink-300 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-500 " +
  "aria-[invalid=true]:border-out";

/** Labels are always visible. A placeholder disappears the moment it is needed most. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="type-meta mb-1.5 block text-[0.625rem] text-ink-500">
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[0.75rem] text-out">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[0.75rem] text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select className={cn(CONTROL, "cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}
