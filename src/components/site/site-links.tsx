"use client";

import { createContext, useContext, type ReactNode } from "react";

type SiteLinks = { privacyHref: string | null };

const SiteLinksContext = createContext<SiteLinks>({ privacyHref: null });

/**
 * Links the public site's client components need but cannot look up.
 *
 * Provided once by the site layout rather than passed into every enquiry form,
 * of which there are half a dozen spread across product, category, city and
 * quotation pages.
 */
export function SiteLinksProvider({
  value,
  children,
}: {
  value: SiteLinks;
  children: ReactNode;
}) {
  return (
    <SiteLinksContext.Provider value={value}>
      {children}
    </SiteLinksContext.Provider>
  );
}

export const useSiteLinks = () => useContext(SiteLinksContext);
