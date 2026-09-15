"use client";

import {
  TaxonomyForm,
  type TaxonomyFormValues,
} from "@/components/admin/taxonomy-form";
import {
  createSolutionAction,
  updateSolutionAction,
} from "@/server/solutions/actions";
import type { CategoryChoice } from "@/server/categories/service";
import type { MediaOption } from "@/app/(admin)/admin/pages/[id]/field-inputs";

export type SolutionFormValues = TaxonomyFormValues;

const COPY = {
  noun: "solution",
  idField: "solutionId",
  pathPrefix: "solutions",
  namePlaceholder: "ICU Setup",
  categoriesLegend: "Equipment categories included",
  categoriesEmpty:
    "There are no categories yet. Create some first, then link this solution to the equipment it includes.",
  featureLabel: "Feature this solution in grids and menus",
};

export function SolutionForm(
  props: Omit<
    React.ComponentProps<typeof TaxonomyForm>,
    "copy" | "createAction" | "updateAction"
  > & {
    categories: CategoryChoice[];
    mediaOptions: MediaOption[];
  },
) {
  return (
    <TaxonomyForm
      {...props}
      copy={COPY}
      createAction={createSolutionAction}
      updateAction={updateSolutionAction}
    />
  );
}
