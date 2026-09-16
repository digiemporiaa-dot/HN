import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { solutionIndex } from "@/server/catalogue/public";

export const metadata: Metadata = {
  title: "Solutions",
  description:
    "Packaged offerings we deliver end to end — an intensive care unit, a turnkey theatre.",
  alternates: { canonical: "/solutions" },
};

export default async function Page() {
  const cards = await solutionIndex();

  return (
    <TaxonomyIndex
      title="Solutions"
      description="Packaged offerings we deliver end to end — an intensive care unit, a turnkey theatre."
      trail={[{ label: "Home", href: "/" }, { label: "Solutions" }]}
      cards={cards}
      unit="solutions"
      emptyMessage="No solutions are listed yet."
    />
  );
}
