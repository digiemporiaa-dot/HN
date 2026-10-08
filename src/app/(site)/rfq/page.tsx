import type { Metadata } from "next";

import { Section } from "@/components/ui";
import { MetaChip, PageHero } from "@/components/site/page-hero";
import { RfqComposer } from "@/components/site/rfq-composer";
import { withSeoOverride } from "@/server/seo/overrides";

/**
 * The quotation list.
 *
 * Deliberately out of the index: the page has no content of its own — what it
 * shows is whatever the visitor put in their own browser, so to a crawler it is
 * an empty page, and to anyone arriving on it from a search result it would be
 * one too.
 */
const BASE_METADATA: Metadata = {
  title: "Your quotation list",
  description:
    "The products you have shortlisted, with quantities and notes, ready to send to us as one quotation request.",
  alternates: { canonical: "/rfq" },
  robots: { index: false, follow: true },
};

const STEPS = ["Review quantities", "Add your details", "Receive a quotation"];

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/rfq", BASE_METADATA);
}

export default function RfqPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Quotation list" }]}
        eyebrow="Request for quotation"
        title="Request a quotation."
        description="A tender covers a list, not a machine. Set a quantity for each product, add anything that affects the price, and send the whole list as one request."
        meta={
          <>
            {STEPS.map((step, index) => (
              <MetaChip key={step}>
                <span className="text-primary font-semibold">{index + 1}</span>
                {step}
              </MetaChip>
            ))}
          </>
        }
      />

      <Section spacing="normal" container="wide">
        <RfqComposer />
      </Section>
    </>
  );
}
