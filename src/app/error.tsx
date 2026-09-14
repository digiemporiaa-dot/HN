"use client";

import { useEffect } from "react";

import { Button, Container } from "@/components/ui";

/**
 * Route-level error boundary. The raw error is never rendered — production users
 * see a stable message while the digest gives support a way to correlate the
 * incident with server logs.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <Container
      width="narrow"
      as="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 py-24 text-center"
    >
      <span className="text-overline text-primary uppercase">
        Unexpected error
      </span>
      <h1 className="text-h1 text-ink">Something went wrong</h1>
      <p className="text-body-lg text-ink-muted max-w-[52ch]">
        We were unable to complete that request. Please try again — if the
        problem continues, contact our team.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
      </div>
      {error.digest ? (
        <p className="text-caption text-ink-subtle">
          Reference: {error.digest}
        </p>
      ) : null}
    </Container>
  );
}
