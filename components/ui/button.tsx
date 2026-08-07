import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
  #2196F3 only reaches 3.1:1 against white, so it is never a text-bearing fill.
  Solid actions sit on navy; on a navy ground the same action inverts to paper.
*/
type Variant = "primary" | "invert" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-navy-700 text-white hover:bg-navy-800 active:bg-navy-900 border border-navy-700 hover:border-navy-800",
  invert:
    "bg-white text-navy-900 hover:bg-blue-100 active:bg-blue-300 border border-white hover:border-blue-100",
  outline:
    "bg-transparent text-ink-900 border border-line-strong hover:bg-blue-50 hover:border-blue-500 active:bg-blue-100",
  ghost: "bg-transparent text-ink-700 border border-transparent hover:bg-blue-50 hover:text-ink-900",
  danger: "bg-out text-white border border-out hover:brightness-110 active:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5",
  md: "h-9 px-4 text-[0.875rem] gap-2",
  lg: "h-11 px-5 text-[0.9375rem] gap-2",
};

const BASE =
  "inline-flex cursor-pointer items-center justify-center rounded-sm font-medium transition-colors duration-150 " +
  "disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap select-none";

interface Shared {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: Shared & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: Shared & ComponentPropsWithoutRef<typeof Link>) {
  return <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}
