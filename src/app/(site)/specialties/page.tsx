import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { specialtyIndex } from "@/server/catalogue/public";

export const metadata: Metadata = {
  title: "Specialties",
  description: "The clinical departments we equip.",
  alternates: { canonical: "/specialties" },
};

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
