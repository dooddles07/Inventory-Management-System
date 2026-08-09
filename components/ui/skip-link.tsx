/**
 * The app puts nine tab stops - the rail, the top bar - before the screen's own controls,
 * and the parts table adds two per row after that. This is the way past them.
 */
export function SkipLink({ href = "#main-content" }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:border focus:border-line-strong focus:bg-surface focus:px-4 focus:py-2 focus:text-[0.875rem] focus:font-medium focus:text-ink-900 focus:shadow-pop"
    >
      Skip to content
    </a>
  );
}
