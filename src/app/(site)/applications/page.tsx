import type { Metadata } from "next";

import { TaxonomyIndex } from "@/components/site/taxonomy-landing";
import { applicationIndex } from "@/server/catalogue/public";

export const metadata: Metadata = {
  title: "Applications",
  description: "What the equipment is used for, procedure by procedure.",
  alternates: { canonical: "/applications" },
};

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
