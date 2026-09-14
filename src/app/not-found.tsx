import Link from "next/link";
import type { Metadata } from "next";

import { buttonStyles, Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Container
      width="narrow"
      as="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 py-24 text-center"
    >
      <span className="text-overline text-primary uppercase">Error 404</span>
      <h1 className="text-h1 text-ink">This page could not be found</h1>
      <p className="text-body-lg text-ink-muted max-w-[52ch]">
        The page you are looking for may have been moved, renamed, or is no
        longer available.
      </p>
      <Link href="/" className={buttonStyles({ variant: "primary", size: "lg" })}>
        Return to homepage
      </Link>
    </Container>
  );
}
