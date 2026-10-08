import type { Metadata } from "next";

import { NotFoundPanel } from "@/components/site/not-found-panel";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** The fallback for addresses outside the public site's own layout. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <NotFoundPanel as="main" />
    </div>
  );
}
