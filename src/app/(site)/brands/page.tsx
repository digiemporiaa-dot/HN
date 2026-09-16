import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { brandIndex } from "@/server/catalogue/public";

export const metadata: Metadata = {
  title: "Brands",
  description:
    "The manufacturers whose equipment we supply, install and service.",
  alternates: { canonical: "/brands" },
};

export default async function Page() {
  const cards = await brandIndex();

  return (
    <TaxonomyIndex
      title="Brands"
      description="The manufacturers whose equipment we supply, install and service."
      trail={[{ label: "Home", href: "/" }, { label: "Brands" }]}
      cards={cards}
      unit="brands"
      emptyMessage="No manufacturers are listed yet."
    />
  );
}
