const STEPS = [
  {
    reference: "GRN-40218",
    title: "Stock arrives",
    body: "Scan the delivery in against its goods receipt note. The count goes up and the note stays attached to it.",
  },
  {
    reference: "TRF-3042",
    title: "It gets a bin",
    body: "Put it away and record where. From now on the part has an address anyone can read off a shelf label.",
  },
  {
    reference: "PICK-70155",
    title: "Someone picks it",
    body: "The count comes down as work goes out. When it crosses the reorder point the part moves to the top of the restocking list.",
  },
  {
    reference: "CC-204",
    title: "You check the shelf",
    body: "Cycle counts correct the drift between what the system says and what is actually there. Every correction is logged.",
  },
];

/** A real sequence, so the steps are ordered and the reference codes carry the order. */
export function HowItWorks() {
  return (
    <section id="how" className="border-b border-line bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <h2 className="type-title max-w-xl text-[clamp(1.625rem,3vw,2.25rem)] text-ink-900">
          One part, from the loading bay to the shelf and out again.
        </h2>
        <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-700">
          Nothing here asks you to change how the warehouse runs. It records what already
          happens, and keeps the count honest between counts.
        </p>

        {/* A rule runs behind the markers so the four steps read as one path, not four boxes. */}
        <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span
            aria-hidden="true"
            className="absolute top-[7px] right-4 left-4 hidden h-px bg-line-strong lg:block"
          />
          {STEPS.map((step) => (
            <li key={step.reference} className="relative">
              <span
                aria-hidden="true"
                className="mb-5 block h-3.5 w-3.5 rounded-full border-2 border-blue-500 bg-paper"
              />
              <p className="type-data text-[0.75rem] text-blue-700">{step.reference}</p>
              <h3 className="type-title mt-2 text-[1.0625rem] text-ink-900">{step.title}</h3>
              <p className="mt-2 max-w-xs text-[0.875rem] leading-relaxed text-ink-700">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
