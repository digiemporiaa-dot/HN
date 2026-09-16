"use client";

import { useEffect, useState } from "react";

/**
 * Where this enquiry is being sent from, posted with it.
 *
 * Only the browser knows these. The page a form sits on and the campaign
 * parameters in its address bar are both gone by the time a server action runs,
 * and neither can be recovered afterwards — "which page produced this lead" is
 * the first question asked of any campaign, and the answer has to be captured
 * at the moment it is still true.
 *
 * Read after mount rather than during render, so the markup a visitor is first
 * served is the same one the server produced. The values are empty for the
 * instant before that, which matters to nobody: a submission cannot happen
 * before the page has mounted.
 *
 * The server treats all of it as a claim. It is clamped, stored for a person to
 * read, and never used to decide anything.
 */
const UTM_KEYS = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
  ["utmTerm", "utm_term"],
  ["utmContent", "utm_content"],
] as const;

export function LeadContextFields() {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const next: Record<string, string> = {
        // The path and query, never the origin: an enquiry cannot claim to have
        // come from somebody else's site.
        landingPage: `${url.pathname}${url.search}`.slice(0, 300),
      };
      for (const [field, param] of UTM_KEYS) {
        const value = url.searchParams.get(param);
        if (value) next[field] = value.slice(0, 160);
      }
      setValues(next);
    } catch {
      // A URL the browser will not parse is not worth failing a form over.
    }
  }, []);

  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}
