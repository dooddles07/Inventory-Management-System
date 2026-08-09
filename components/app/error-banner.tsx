"use client";

import { X } from "lucide-react";
import { useInventory } from "@/lib/store/inventory-context";

/** The only place a repository failure becomes visible. Without it, saves fail in silence. */
export function ErrorBanner() {
  const { error, dismissError } = useInventory();
  if (!error) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-b border-out bg-out-wash px-4 py-2.5 sm:px-6"
    >
      <p className="flex-1 text-[0.8125rem] leading-relaxed text-out">{error}</p>
      <button
        type="button"
        onClick={dismissError}
        aria-label="Dismiss this message"
        className="-mt-0.5 shrink-0 cursor-pointer rounded-xs p-1 text-out transition-opacity duration-150 hover:opacity-70"
      >
        <X size={15} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}
