import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { specialtyIndex } from "@/server/catalogue/public";
import { withSeoOverride } from "@/server/seo/overrides";

const BASE_METADATA: Metadata = {
  title: "Specialties",
  description: "The clinical departments we equip.",
  alternates: { canonical: "/specialties" },
};

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/specialties", BASE_METADATA);
}

export default async function Page() {
  const cards = await specialtyIndex();

  return (
    <TaxonomyIndex
      title="Specialties"
      description="The clinical departments we equip."
      trail={[{ label: "Home", href: "/" }, { label: "Specialties" }]}
      cards={cards}
      unit="specialties"
      emptyMessage="No specialties are listed yet."
    />
  );
}
