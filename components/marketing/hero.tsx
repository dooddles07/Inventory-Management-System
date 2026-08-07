import { ButtonLink } from "@/components/ui/button";
import { formatUnits } from "@/lib/format";
import type { FloorAisle } from "@/lib/inventory/floor";
import { FloorMap } from "./floor-map";

interface HeroProps {
  floor: FloorAisle[];
  stats: { skus: number; binsUsed: number; totalBins: number; belowReorder: number };
}

export function Hero({ floor, stats }: HeroProps) {
  return (
    <section className="on-navy bg-navy-700 text-on-navy">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] lg:items-center lg:gap-14 lg:py-20">
        <div>
          <p className="type-label text-blue-300">A-01 &middot; Warehouse floor</p>

          <h1 className="type-display mt-5 text-[clamp(2.125rem,4.4vw,3.375rem)]">
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

          <dl className="mt-10 grid max-w-md grid-cols-3 border-t border-[#1c5bb8] pt-5">
            <Stat label="Parts tracked" value={formatUnits(stats.skus)} />
            <Stat
              label="Bins in use"
              value={`${formatUnits(stats.binsUsed)}/${formatUnits(stats.totalBins)}`}
              bordered
            />
            <Stat label="Need restocking" value={formatUnits(stats.belowReorder)} bordered accent />
          </dl>
        </div>

        <FloorMap floor={floor} totalBins={stats.totalBins} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  bordered,
  accent,
}: {
  label: string;
  value: string;
  bordered?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={bordered ? "border-l border-[#1c5bb8] pl-4" : "pr-4"}>
      {/* Reserves two label lines on narrow screens so the three readouts share a baseline. */}
      <dt className="type-label min-h-[2.1em] text-[0.625rem] text-on-navy-muted sm:min-h-0">
        {label}
      </dt>
      <dd
        className={`type-data mt-1.5 text-[1.375rem] ${accent ? "text-blue-300" : "text-on-navy"}`}
        data-numeric
      >
        {value}
      </dd>
    </div>
  );
}
