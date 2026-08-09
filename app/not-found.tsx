import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/marketing/wordmark";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="on-navy flex min-h-dvh flex-col items-center justify-center bg-navy-700 px-5 text-center text-on-navy">
      <Wordmark tone="light" />

      <p className="type-data mt-10 text-[0.8125rem] text-blue-300" data-numeric>
        404
      </p>
      <h1 className="type-title mt-2 text-[clamp(1.625rem,4vw,2.25rem)]">
        No such page, and no such bin.
      </h1>
      <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-on-navy-muted">
        The address you followed does not point anywhere in this app. Head back to the
        floor and try again from there.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/app" variant="invert">
          Open Stockroom
        </ButtonLink>
        <ButtonLink
          href="/"
          className="border-[#3d7ed0] bg-transparent text-on-navy hover:border-blue-300 hover:bg-navy-800"
        >
          Back to the site
        </ButtonLink>
      </div>
    </main>
  );
}
