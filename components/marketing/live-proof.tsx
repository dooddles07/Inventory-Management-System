import { ButtonLink } from "@/components/ui/button";
import { formatMoney, formatUnits } from "@/lib/format";
import { lineValue, statusOf, type ReorderLine } from "@/lib/inventory/derive";
import type { Item } from "@/lib/inventory/types";

const STATUS_TEXT: Record<string, { label: string; className: string }> = {
  ok: { label: "In stock", className: "bg-ok-wash text-ok" },
  low: { label: "Below reorder", className: "bg-low-wash text-low" },
  out: { label: "Out of stock", className: "bg-out-wash text-out" },
};

/**
 * The real parts table, rendered from the same seed the app uses.
 * A screenshot would be easier and less honest.
 */
export function PartsProof({ items }: { items: Item[] }) {
  return (
    <section id="floor" className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:py-20">
        <div>
          <h2 className="type-title text-[clamp(1.625rem,3vw,2.25rem)] text-ink-900">
            Everything on one screen, sorted the way you need it.
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-700">
            Filter by category, supplier or stock level. Sort by what is worth the most or
            what ran out first. Click a row to change a count, move a part to a different
            bin, or print its shelf label.
          </p>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-500">
            The table below is the real one, running on the same sample warehouse you get
            when you open the app.
          </p>
          <ButtonLink href="/app/items" className="mt-7">
            Open the parts list
          </ButtonLink>
        </div>

        <div className="overflow-hidden rounded-md border border-line shadow-card">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-paper">
                <th scope="col" className="type-meta px-3 py-2.5 text-[0.625rem] text-ink-500">
                  Part
                </th>
                <th
                  scope="col"
                  className="type-meta hidden px-3 py-2.5 text-[0.625rem] text-ink-500 sm:table-cell"
                >
                  Bin
                </th>
                <th
                  scope="col"
                  className="type-meta px-3 py-2.5 text-right text-[0.625rem] text-ink-500"
                >
                  On hand
                </th>
                <th
                  scope="col"
                  className="type-meta hidden px-3 py-2.5 text-right text-[0.625rem] text-ink-500 md:table-cell"
                >
                  Value
                </th>
                <th
                  scope="col"
                  className="type-meta px-3 py-2.5 text-right text-[0.625rem] text-ink-500"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {items.map((item) => {
                const status = STATUS_TEXT[statusOf(item)];
                return (
                  <tr key={item.id}>
                    <td className="px-3 py-2.5">
                      <span className="block truncate text-[0.8125rem] text-ink-900">
                        {item.name}
                      </span>
                      <span className="type-data block text-[0.6875rem] text-ink-500">
                        {item.sku}
                      </span>
                    </td>
                    <td className="type-data hidden px-3 py-2.5 text-[0.8125rem] text-ink-700 sm:table-cell">
                      {item.bin}
                    </td>
                    <td
                      className="type-data px-3 py-2.5 text-right text-[0.8125rem] text-ink-900"
                      data-numeric
                    >
                      {formatUnits(item.qty)}
                    </td>
                    <td
                      className="type-data hidden px-3 py-2.5 text-right text-[0.8125rem] text-ink-700 md:table-cell"
                      data-numeric
                    >
                      {formatMoney(lineValue(item))}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`type-meta inline-block rounded-xs px-1.5 py-1 text-[0.625rem] ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** The restocking queue, with the supplier lead time that makes it urgent. */
export function RestockProof({ queue }: { queue: ReorderLine[] }) {
  return (
    <section className="border-b border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:py-20">
        <div className="order-2 overflow-hidden rounded-md border border-line bg-surface shadow-card lg:order-1">
          <div className="border-b border-line px-4 py-3">
            {/* A panel label, not a section: the h2 for this block sits in the column beside it. */}
            <p className="type-title text-[0.9375rem] text-ink-900">Needs restocking</p>
            <p className="mt-0.5 text-[0.8125rem] text-ink-500">Most urgent first</p>
          </div>
          <ul className="divide-y divide-line">
            {queue.map(({ item, supplier, shortfall, coverDays }) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${item.qty <= 0 ? "bg-out" : "bg-low"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] text-ink-900">{item.name}</span>
                  <span className="type-data block text-[0.6875rem] text-ink-500">
                    {item.sku} &middot; {item.bin}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="type-data block text-[0.8125rem] text-ink-900" data-numeric>
                    order {formatUnits(shortfall)}
                  </span>
                  <span className="block text-[0.75rem] text-ink-500">
                    {supplier?.name ?? "No supplier"}
                    {coverDays !== null && `, ${coverDays}d`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 lg:order-2">
          <h2 className="type-title text-[clamp(1.625rem,3vw,2.25rem)] text-ink-900">
            A shortage is a date, not a number.
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-700">
            Forty units left means nothing on its own. Forty units left, going out at six a
            day, from a supplier who takes three weeks, means you should have ordered
            already.
          </p>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-700">
            Stockroom sorts the restocking list by how far past the line each part is and
            how long the supplier takes, so the top of the list is genuinely the top.
          </p>
        </div>
      </div>
    </section>
  );
}
