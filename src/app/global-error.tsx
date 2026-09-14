"use client";

import { useEffect } from "react";

/**
 * Replaces the root layout when it is the layout itself that failed, so this
 * file must render its own <html> and cannot rely on the design system.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#ffffff",
          color: "#0a1626",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.875rem", margin: "0 0 0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#55677d", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
            The application could not be loaded. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: "2.75rem",
              padding: "0 1.5rem",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#1f66dc",
              color: "#ffffff",
              fontSize: "0.9375rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
