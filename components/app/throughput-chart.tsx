import { formatUnits } from "@/lib/format";

const WIDTH = 560;
const HEIGHT = 96;

/**
 * Units moved per day. Hand-rolled rather than pulling a chart library for one shape.
 * The peak and the axis are labelled, so the line reports a number instead of a vibe.
 */
export function ThroughputChart({ series, days }: { series: number[]; days: number }) {
  if (series.length === 0) return null;

  const peak = Math.max(...series, 1);
  const step = WIDTH / Math.max(series.length - 1, 1);
  const points = series.map((value, index) => {
    const x = index * step;
    const y = HEIGHT - (value / peak) * (HEIGHT - 8) - 2;
    return [x, y] as const;
  });

  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const area = `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`;
  const total = series.reduce((sum, value) => sum + value, 0);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Units moved per day over the last ${days} days. Peak ${formatUnits(peak)} units.`}
        className="h-24 w-full"
      >
        <path d={area} fill="var(--color-blue-100)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-blue-500)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="mt-2 flex items-baseline justify-between text-[0.75rem] text-ink-500">
        <span>Last {days} days</span>
        <span className="type-data" data-numeric>
          {formatUnits(total)} units moved &middot; peak {formatUnits(peak)}/day
        </span>
      </figcaption>
    </figure>
  );
}
