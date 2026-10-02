import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { categoryIndex } from "@/server/catalogue/public";
import { withSeoOverride } from "@/server/seo/overrides";

const BASE_METADATA: Metadata = {
  title: "Categories",
  description: "Every part of the catalogue, from imaging to intensive care.",
  alternates: { canonical: "/categories" },
};

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/categories", BASE_METADATA);
}

export default async function Page() {
  const cards = await categoryIndex();

  return (
    <TaxonomyIndex
      title="Categories"
      description="Every part of the catalogue, from imaging to intensive care."
      trail={[{ label: "Home", href: "/" }, { label: "Categories" }]}
      cards={cards}
      unit="categories"
      emptyMessage="The catalogue is being prepared."
    />
  );
}
