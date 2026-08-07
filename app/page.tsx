import { Hero } from "@/components/marketing/hero";
import { SiteHeader } from "@/components/marketing/site-header";
import { statusOf, totals } from "@/lib/inventory/derive";
import { buildFloor } from "@/lib/inventory/floor";
import { allBins, createSeedSnapshot } from "@/lib/inventory/seed";

export default function MarketingPage() {
  // The landing page runs on the same seed the app does, so nothing here is a mockup.
  const snapshot = createSeedSnapshot();
  const summary = totals(snapshot.items);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero
          floor={buildFloor(snapshot.items)}
          stats={{
            skus: summary.skus,
            binsUsed: summary.binsUsed,
            totalBins: allBins().length,
            belowReorder: snapshot.items.filter((item) => statusOf(item) !== "ok").length,
          }}
        />
      </main>
    </>
  );
}
