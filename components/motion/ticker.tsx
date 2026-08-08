"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface TickerProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

/**
 * Counts to the value once. Motion here reports that a figure changed;
 * with reduced motion the number is rendered directly and nothing animates.
 */
export function Ticker({ value, format = (n) => String(Math.round(n)), className }: TickerProps) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const controls = animate(previous.current, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setShown(latest),
      onComplete: () => {
        previous.current = value;
      },
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <span className={className} data-numeric>
      {format(reduced ? value : shown)}
    </span>
  );
}
