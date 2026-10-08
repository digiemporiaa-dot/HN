"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button, buttonStyles, Container } from "@/components/ui";

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
    <main className="surface-grid flex min-h-dvh items-center">
      <Container width="narrow" className="flex flex-col items-start gap-6 py-24">
        <span className="eyebrow">Unexpected error</span>
        <h1 className="text-section text-ink">Something went wrong.</h1>
        <p className="text-lead text-ink-muted max-w-[52ch]">
          We were unable to complete that request. Please try again — if the
          problem continues, contact our team.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Link href="/" className={buttonStyles({ variant: "outline", size: "lg" })}>
            Return to homepage
          </Link>
        </div>
        {error.digest ? (
          <p className="border-line bg-surface text-caption text-ink-subtle rounded-full border px-3 py-1.5">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </Container>
    </main>
  );
}
