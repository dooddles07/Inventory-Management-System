"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/marketing/wordmark";
import { cn } from "@/lib/cn";
import { useInventory } from "@/lib/store/inventory-context";
import { statusOf } from "@/lib/inventory/derive";
import { NAV_ITEMS } from "./nav-config";

function useActive() {
  const pathname = usePathname();
  return (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href));
}

/** Count of parts needing attention, shown against Parts so the rail carries live state. */
function useAttentionCount() {
  const { snapshot, ready } = useInventory();
  if (!ready) return null;
  return snapshot.items.filter((item) => statusOf(item) !== "ok").length;
}

export function RailNav() {
  const isActive = useActive();
  const attention = useAttentionCount();

  return (
    <nav
      aria-label="Sections"
      className="on-navy hidden w-60 shrink-0 flex-col border-r border-[#1c5bb8] bg-navy-700 lg:flex"
    >
      <div className="flex h-14 items-center border-b border-[#1c5bb8] px-5">
        <Link href="/" className="rounded-xs">
          <Wordmark tone="light" />
        </Link>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-sm px-3 py-2 text-[0.875rem] transition-colors duration-150",
                  active
                    ? "bg-navy-900 font-medium text-on-navy"
                    : "text-on-navy-muted hover:bg-navy-800 hover:text-on-navy",
                )}
              >
                {/* #90CAF9, not #2196F3: the brighter blue is the only one that clears 4.5:1 on navy. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-xs bg-blue-300 transition-opacity duration-150",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon size={17} strokeWidth={1.9} aria-hidden="true" className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/app/items" && attention !== null && attention > 0 && (
                  <span
                    className="type-data rounded-xs bg-navy-900 px-1.5 py-0.5 text-[0.6875rem] text-blue-300 group-aria-[current=page]:bg-navy-700"
                    data-numeric
                  >
                    {attention}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-[#1c5bb8] p-3">
        <Link
          href="/"
          className="block rounded-sm px-3 py-2 text-[0.8125rem] text-on-navy-muted transition-colors duration-150 hover:bg-navy-800 hover:text-on-navy"
        >
          Back to site
        </Link>
      </div>
    </nav>
  );
}

/** Below lg the rail becomes a scrollable strip. A menu behind a modal would be worse for five links. */
export function StripNav() {
  const isActive = useActive();

  return (
    <nav
      aria-label="Sections"
      className="on-navy border-b border-[#1c5bb8] bg-navy-700 lg:hidden"
    >
      <ul className="flex gap-1 overflow-x-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-3 py-2 text-[0.8125rem] whitespace-nowrap transition-colors duration-150",
                  active
                    ? "bg-navy-900 font-medium text-on-navy"
                    : "text-on-navy-muted hover:bg-navy-800 hover:text-on-navy",
                )}
              >
                <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
