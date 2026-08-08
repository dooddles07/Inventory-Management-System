import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";


const PLANS = [
  {
    name: "Shelf",
    price: "Free",
    note: "One stockroom, up to 250 parts",
    features: [
      "Bin addressing and shelf labels",
      "Reorder points and restocking list",
      "Movement history",
      "One person",
    ],
    cta: "Start with this",
    featured: false,
  },
  {
    name: "Warehouse",
    price: "$29",
    period: "per month",
    note: "One building, no part limit",
    features: [
      "Everything in Shelf",
      "Up to eight people",
      "Supplier lead times and cover dates",
      "Cycle counts and count sheets",
      "CSV import and export",
    ],
    cta: "Start with this",
    featured: true,
  },
  {
    name: "Multi-site",
    price: "$89",
    period: "per month",
    note: "Several buildings, one view",
    features: [
      "Everything in Warehouse",
      "Transfers between sites",
      "Unlimited people and roles",
      "API access",
      "Audit export",
    ],
    cta: "Start with this",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <h2 className="type-title max-w-xl text-[clamp(1.625rem,3vw,2.25rem)] text-ink-900">
          Priced per building, not per part.
        </h2>
        <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-700">
          A stockroom that grows should not cost more to keep track of. Change plan or
          cancel whenever; nothing is locked in.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-md border p-5",
                plan.featured
                  ? "border-navy-700 bg-paper shadow-card"
                  : "border-line bg-surface",
              )}
            >
              <h3 className="type-title text-[1.0625rem] text-ink-900">{plan.name}</h3>
              <p className="mt-3 flex items-baseline gap-1.5">
                {/* Mono is for figures. "Free" is a word, so it stays in the interface face. */}
                <span
                  className={cn(
                    "text-[2rem] text-ink-900",
                    plan.period ? "type-data" : "type-title",
                  )}
                  data-numeric={plan.period ? true : undefined}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-[0.8125rem] text-ink-500">{plan.period}</span>
                )}
              </p>
              <p className="mt-1 text-[0.8125rem] text-ink-500">{plan.note}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-[0.875rem] text-ink-700">
                    <Check
                      size={15}
                      strokeWidth={2.4}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-blue-700"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href="/app"
                variant={plan.featured ? "primary" : "outline"}
                className="mt-6 w-full"
              >
                {plan.cta}
              </ButtonLink>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
