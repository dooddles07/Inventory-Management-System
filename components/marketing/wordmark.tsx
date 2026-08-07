import { cn } from "@/lib/cn";

/** Six bins at four fill levels - the product's own data key, shrunk to a mark. */
export function Wordmark({ className, tone = "navy" }: { className?: string; tone?: "navy" | "light" }) {
  const cells = ["#0d47a1", "#2196f3", "#90caf9", "#2196f3", "#e3f2fd", "#0d47a1"];
  const lightCells = ["#afd9fc", "#68b4f7", "#2196f3", "#68b4f7", "#1a63c0", "#afd9fc"];
  const palette = tone === "light" ? lightCells : cells;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid grid-cols-3 grid-rows-2 gap-px" aria-hidden="true">
        {palette.map((color, index) => (
          <span
            key={index}
            className="h-2 w-2 rounded-[1px]"
            style={{ background: color }}
          />
        ))}
      </span>
      <span
        className={cn(
          "type-label text-[0.875rem] tracking-[0.14em]",
          tone === "light" ? "text-on-navy" : "text-ink-900",
        )}
      >
        Stockroom
      </span>
    </span>
  );
}
