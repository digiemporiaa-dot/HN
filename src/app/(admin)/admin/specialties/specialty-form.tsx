"use client";

import {
  TaxonomyForm,
  type TaxonomyFormValues,
} from "@/components/admin/taxonomy-form";
import {
  createSpecialtyAction,
  updateSpecialtyAction,
} from "@/server/specialties/actions";
import type { CategoryChoice } from "@/server/categories/service";
import type { MediaOption } from "@/app/(admin)/admin/pages/[id]/field-inputs";

export type SpecialtyFormValues = TaxonomyFormValues;

const COPY = {
  noun: "specialty",
  idField: "specialtyId",
  pathPrefix: "specialties",
  namePlaceholder: "Intensive Care",
  categoriesLegend: "Equipment categories used",
  categoriesEmpty:
    "There are no categories yet. Create some first, then link this specialty to the equipment it uses.",
  featureLabel: "Feature this specialty in grids and menus",
};

export function SpecialtyForm(
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
      createAction={createSpecialtyAction}
      updateAction={updateSpecialtyAction}
    />
  );
}
