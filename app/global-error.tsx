"use client";

import { useEffect } from "react";

/**
 * Last resort: the root layout itself failed, so this replaces the whole document
 * and cannot rely on any of the app's styles being present.
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#0d47a1",
          color: "#f2f7fd",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
          Stockroom could not start.
        </h1>
        <p style={{ margin: 0, maxWidth: "30rem", lineHeight: 1.6, color: "#a9c6e8" }}>
          Reloading usually clears this. Nothing stored in this browser has been lost.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 1.25rem",
            border: 0,
            borderRadius: 3,
            background: "#ffffff",
            color: "#06203f",
            fontSize: "0.9375rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
