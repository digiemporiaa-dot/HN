import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { applicationIndex } from "@/server/catalogue/public";
import { withSeoOverride } from "@/server/seo/overrides";

const BASE_METADATA: Metadata = {
  title: "Applications",
  description: "What the equipment is used for, procedure by procedure.",
  alternates: { canonical: "/applications" },
};

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/applications", BASE_METADATA);
}

export default async function Page() {
  const cards = await applicationIndex();

  return (
    <TaxonomyIndex
      title="Applications"
      description="What the equipment is used for, procedure by procedure."
      trail={[{ label: "Home", href: "/" }, { label: "Applications" }]}
      cards={cards}
      unit="applications"
      emptyMessage="No applications are listed yet."
    />
  );
}
