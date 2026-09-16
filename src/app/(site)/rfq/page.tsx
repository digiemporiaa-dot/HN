import type { Metadata } from "next";

import { Breadcrumb, Container, Section, SectionHeader } from "@/components/ui";
import { RfqComposer } from "@/components/site/rfq-composer";

/**
 * The quotation list.
 *
 * Deliberately out of the index: the page has no content of its own — what it
 * shows is whatever the visitor put in their own browser, so to a crawler it is
 * an empty page, and to anyone arriving on it from a search result it would be
 * one too.
 */
export const metadata: Metadata = {
  title: "Your quotation list",
  description:
    "The products you have shortlisted, with quantities and notes, ready to send to us as one quotation request.",
  alternates: { canonical: "/rfq" },
  robots: { index: false, follow: true },
};

export default function RfqPage() {
  return (
    <>
      <Container className="pt-6">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Quotation list" }]}
        />
      </Container>

      <Section spacing="normal" container="standard">
        <SectionHeader
          as="h1"
          title="Request a quotation"
          description="A tender covers a list, not a machine. Set a quantity for each product, add anything that affects the price, and send the whole list as one request."
        />

        {/* Narrower than the section: a form and a short list read better in a
            column than across a wide screen. */}
        <div className="mt-8 max-w-[58rem]">
          <RfqComposer />
        </div>
      </Section>
    </>
  );
}
