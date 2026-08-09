import { ButtonLink } from "@/components/ui/button";
import { formatUnits } from "@/lib/format";
import type { FloorAisle } from "@/lib/inventory/floor";
import { FloorMap } from "./floor-map";

interface HeroProps {
  floor: FloorAisle[];
  stats: { skus: number; totalBins: number; belowReorder: number };
}

export function Hero({ floor, stats }: HeroProps) {
  return (
    <section className="on-navy bg-navy-700 text-on-navy">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] lg:items-center lg:gap-14 lg:py-20">
        <div>
          <h1 className="type-display text-[clamp(2.125rem,4.4vw,3.375rem)]">
            Know what&rsquo;s in stock,
            <span className="mt-1 block text-blue-300">and where it is.</span>
          </h1>

          <p className="mt-6 max-w-lg text-[1.0625rem] leading-relaxed text-on-navy-muted">
            Every part gets a bin number, so anyone on shift can walk straight to it.
            Stockroom tells you what is running out and how long the supplier takes to
            deliver, before the shelf is empty.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/app" variant="invert" size="lg">
              Open Stockroom
            </ButtonLink>
            <ButtonLink
              href="/app/map"
              size="lg"
              className="border-[#3d7ed0] bg-transparent text-on-navy hover:border-blue-300 hover:bg-navy-800"
            >
              See the floor map
            </ButtonLink>
          </div>

          {/* The counts read as a sentence about this warehouse, not as a metric row. */}
          <p className="mt-9 max-w-md border-t border-[#1c5bb8] pt-5 text-[0.9375rem] leading-relaxed text-on-navy-muted">
            This warehouse holds{" "}
            <strong className="type-data font-medium text-on-navy" data-numeric>
              {formatUnits(stats.skus)}
            </strong>{" "}
            parts across{" "}
            <strong className="type-data font-medium text-on-navy" data-numeric>
              {formatUnits(stats.totalBins)}
            </strong>{" "}
            bins.{" "}
            <strong className="type-data font-medium text-blue-300" data-numeric>
              {formatUnits(stats.belowReorder)}
            </strong>{" "}
            of those parts are at or below their reorder point.
          </p>
        </div>

        <FloorMap floor={floor} totalBins={stats.totalBins} />
      </div>
    </section>
  );
}
