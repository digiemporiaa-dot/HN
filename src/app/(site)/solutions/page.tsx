import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { solutionIndex } from "@/server/catalogue/public";
import { withSeoOverride } from "@/server/seo/overrides";

const BASE_METADATA: Metadata = {
  title: "Solutions",
  description:
    "Complete instrument sets, portable endoscopy systems and spare parts, quoted to your requirement.",
  alternates: { canonical: "/solutions" },
};

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/solutions", BASE_METADATA);
}

export default async function Page() {
  const cards = await solutionIndex();

  return (
    <TaxonomyIndex
      title="Solutions"
      description="Complete instrument sets, portable endoscopy systems and spare parts, quoted to your requirement."
      trail={[{ label: "Home", href: "/" }, { label: "Solutions" }]}
      cards={cards}
      unit="solutions"
      emptyMessage="No solutions are listed yet."
    />
  );
}
