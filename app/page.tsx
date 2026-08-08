import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PartsProof, RestockProof } from "@/components/marketing/live-proof";
import { Pricing } from "@/components/marketing/pricing";
import { SiteHeader } from "@/components/marketing/site-header";
import { ClosingCta, SiteFooter } from "@/components/marketing/site-footer";
import { lineValue, reorderQueue, statusOf, totals } from "@/lib/inventory/derive";
import { buildFloor } from "@/lib/inventory/floor";
import { allBins, createSeedSnapshot } from "@/lib/inventory/seed";

export default function MarketingPage() {
  // The landing page runs on the same seed the app does, so nothing here is a mockup.
  const snapshot = createSeedSnapshot();
  const summary = totals(snapshot.items);

  const showcase = [...snapshot.items].sort((a, b) => lineValue(b) - lineValue(a)).slice(0, 7);
  const queue = reorderQueue(snapshot.items, snapshot.suppliers, 5);

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
        <HowItWorks />
        <PartsProof items={showcase} />
        <RestockProof queue={queue} />
        <Pricing />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
