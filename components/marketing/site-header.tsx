import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "./wordmark";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#floor", label: "The parts list" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="on-navy border-b border-[#1c5bb8] bg-navy-700">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="rounded-xs">
          <Wordmark tone="light" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xs text-[0.875rem] text-on-navy-muted transition-colors duration-150 hover:text-on-navy"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ButtonLink href="/app" variant="invert" size="sm">
          Open Stockroom
        </ButtonLink>
      </div>
    </header>
  );
}
