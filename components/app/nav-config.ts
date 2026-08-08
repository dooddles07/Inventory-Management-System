import { Boxes, Grid3x3, LayoutDashboard, ArrowLeftRight, Truck } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/items", label: "Parts", icon: Boxes, exact: false },
  { href: "/app/map", label: "Floor map", icon: Grid3x3, exact: false },
  { href: "/app/movements", label: "Movements", icon: ArrowLeftRight, exact: false },
  { href: "/app/suppliers", label: "Suppliers", icon: Truck, exact: false },
] as const;

export function titleFor(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)));
  return match?.label ?? "Overview";
}
