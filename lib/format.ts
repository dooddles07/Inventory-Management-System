const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const units = new Intl.NumberFormat("en-US");

/** Minor units in, display string out. */
export function formatMoney(minor: number): string {
  return money.format(minor / 100);
}

export function formatCompactMoney(minor: number): string {
  const major = minor / 100;
  if (major >= 1_000_000) return `$${(major / 1_000_000).toFixed(1)}M`;
  if (major >= 1_000) return `$${(major / 1_000).toFixed(1)}k`;
  return money.format(major);
}

export function formatUnits(value: number): string {
  return units.format(value);
}

export function formatSignedUnits(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${units.format(Math.abs(value))}`;
}

const RELATIVE_STEPS: Array<[limit: number, divisor: number, unit: Intl.RelativeTimeFormatUnit]> = [
  [60_000, 1_000, "second"],
  [3_600_000, 60_000, "minute"],
  [86_400_000, 3_600_000, "hour"],
  [604_800_000, 86_400_000, "day"],
  [2_592_000_000, 604_800_000, "week"],
  [31_536_000_000, 2_592_000_000, "month"],
  [Number.POSITIVE_INFINITY, 31_536_000_000, "year"],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelative(iso: string, now: number): string {
  const delta = Date.parse(iso) - now;
  const magnitude = Math.abs(delta);
  for (const [limit, divisor, unit] of RELATIVE_STEPS) {
    if (magnitude < limit) return relative.format(Math.round(delta / divisor), unit);
  }
  // The last step runs to infinity, so this only exists to satisfy the return type.
  return iso.slice(0, 10);
}

const absolute = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return absolute.format(new Date(iso));
}

/** "C-04-12" reads as aisle C, rack 4, shelf 12. Anything else is handed back untouched. */
export function describeBin(code: string): string {
  const [aisle, rack, shelf] = code.split("-");
  if (!aisle || !rack || !shelf) return code;

  const rackNumber = Number(rack);
  const shelfNumber = Number(shelf);
  if (!Number.isFinite(rackNumber) || !Number.isFinite(shelfNumber)) return code;

  return `Aisle ${aisle}, rack ${rackNumber}, shelf ${shelfNumber}`;
}
