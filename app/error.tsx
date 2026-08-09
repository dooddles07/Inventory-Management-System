"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/marketing/wordmark";
import { clearStoredSnapshot } from "@/lib/inventory/local-repository";

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
        Your parts and movements are still stored in this browser. Try the screen again.
        If it keeps failing, what is stored is the likely cause, and starting the sample
        warehouse over will clear it.
      </p>
      {error.digest && (
        <p className="type-data mt-4 text-[0.75rem] text-ink-500">Reference {error.digest}</p>
      )}

      {/*
        This page replaces the app shell, and the top bar's reset button with it, so the
        way out has to be here. Without it a browser holding something unusable loops:
        "Try again" re-reads the same thing and fails the same way.
      */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button
          variant="outline"
          onClick={() => {
            clearStoredSnapshot();
            // A full document load on purpose: a client-side navigation would keep the
            // broken tree and the repository that already read the bad snapshot.
            window.location.assign(new URL("/app", window.location.origin).toString());
          }}
        >
          Start the sample warehouse over
        </Button>
        <ButtonLink href="/" variant="ghost">
          Back to the site
        </ButtonLink>
      </div>
    </main>
  );
}
