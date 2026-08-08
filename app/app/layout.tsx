import type { Metadata } from "next";
import { RailNav, StripNav } from "@/components/app/app-nav";
import { Topbar } from "@/components/app/topbar";
import { InventoryProvider } from "@/lib/store/inventory-context";

export const metadata: Metadata = {
  title: "Overview",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <InventoryProvider>
      <div className="flex h-dvh overflow-hidden bg-paper">
        <RailNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <StripNav />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </InventoryProvider>
  );
}
