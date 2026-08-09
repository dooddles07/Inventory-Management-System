"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/marketing/wordmark";

/** Catches anything a route throws while rendering, so a fault never lands as a blank page. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-5 text-center">
      <Wordmark />

      <h1 className="type-title mt-10 text-[clamp(1.5rem,4vw,2rem)] text-ink-900">
        Something broke on this screen.
      </h1>
      <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-ink-700">
        Your parts and movements are still stored in this browser. Try the screen again,
        and if it keeps failing, reset the sample data from the top bar.
      </p>
      {error.digest && (
        <p className="type-data mt-4 text-[0.75rem] text-ink-500">Reference {error.digest}</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/app" variant="outline">
          Back to the overview
        </ButtonLink>
      </div>
    </main>
  );
}
