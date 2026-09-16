import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { categoryIndex } from "@/server/catalogue/public";

export const metadata: Metadata = {
  title: "Categories",
  description: "Every part of the catalogue, from imaging to intensive care.",
  alternates: { canonical: "/categories" },
};

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
