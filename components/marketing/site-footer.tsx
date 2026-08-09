import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "./wordmark";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/app", label: "Overview" },
      { href: "/app/items", label: "Parts" },
      { href: "/app/map", label: "Floor map" },
      { href: "/app/movements", label: "Movements" },
    ],
  },
  {
    heading: "On this page",
    links: [
      { href: "#how", label: "How it works" },
      { href: "#floor", label: "The parts list" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
];

export function ClosingCta() {
  return (
    <section className="on-navy bg-navy-700 text-on-navy">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20">
        <div>
          <h2 className="type-title text-[clamp(1.625rem,3vw,2.25rem)]">
            Open it and start moving stock.
          </h2>
          <p className="mt-3 max-w-lg text-[1.0625rem] leading-relaxed text-on-navy-muted">
            The sample warehouse is already loaded, so you can add a part, pick from a bin
            and watch the restocking list react. Nothing to install, no account.
          </p>
        </div>
        <ButtonLink href="/app" variant="invert" size="lg" className="shrink-0">
          Open Stockroom
        </ButtonLink>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="on-navy border-t border-[#1c5bb8] bg-navy-900 text-on-navy">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Wordmark tone="light" />
          <p className="mt-4 max-w-xs text-[0.875rem] leading-relaxed text-on-navy-muted">
            Inventory tracking for small warehouses. Built as a portfolio project, with a
            working data layer rather than a set of screenshots.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            {/* The nav is already named by aria-label, so this stays out of the heading outline. */}
            <p className="type-meta text-[0.625rem] text-on-navy-muted">{column.heading}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-xs text-[0.875rem] text-on-navy-muted transition-colors duration-150 hover:text-on-navy"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-[#1c5bb8]">
        <p className="mx-auto max-w-6xl px-5 py-4 text-[0.8125rem] text-on-navy-muted sm:px-8">
          Sample data only. Everything you change stays in your browser.
        </p>
      </div>
    </footer>
  );
}
