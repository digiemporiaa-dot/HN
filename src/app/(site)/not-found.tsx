import type { Metadata } from "next";

import { NotFoundPanel } from "@/components/site/not-found-panel";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * A missing page inside the public site keeps the header and footer, so the
 * visitor who followed a stale link still has the whole navigation to hand.
 */
export default function SiteNotFound() {
  return <NotFoundPanel />;
}
