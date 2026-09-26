"use client";

import { useActionState } from "react";

import { Button, Field } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { EntityPicker } from "@/components/admin/sections/entity-picker";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { MAX_CITY_LINKS } from "@/lib/validation/locations";
import type { EntityChoice } from "@/server/cms/catalogue-choices";
import {
  saveCityLinksAction,
  type LocationActionState,
} from "@/server/locations/actions";

const INITIAL: LocationActionState = {};

type Links = {
  categoryIds: string[];
  productIds: string[];
  specialtyIds: string[];
};

/**
 * What a city page features, each list in the order it is shown.
 *
 * Posted as JSON from this component's own state: the lists are ordered, and a
 * choice hidden by the picker's search is still a choice that must be saved.
 */
export function CityLinks({
  cityId,
  values,
  version,
  choices,
  readOnly,
}: {
  cityId: string;
  values: Links;
  version: string;
  choices: {
    categories: EntityChoice[];
    products: EntityChoice[];
    specialties: EntityChoice[];
  };
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveCityLinksAction,
    INITIAL,
  );
  const [links, setLinks] = useSyncedState(values, version);

  const set = (key: keyof Links, next: string[]) =>
    setLinks((current) => ({ ...current, [key]: next }));

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="cityId" value={cityId} />
      <input
        type="hidden"
        name="categoryIds"
        value={JSON.stringify(links.categoryIds)}
      />
      <input
        type="hidden"
        name="productIds"
        value={JSON.stringify(links.productIds)}
      />
      <input
        type="hidden"
        name="specialtyIds"
        value={JSON.stringify(links.specialtyIds)}
      />
      <FormFeedback state={state} />

      <Field
        label="Categories"
        help="Ranges supplied here. Drafts can be chosen; the public page shows only what is published."
        error={state.fieldErrors?.categoryIds}
      >
        {() => (
          <EntityPicker
            entity="category"
            value={links.categoryIds}
            choices={choices.categories}
            max={MAX_CITY_LINKS}
            disabled={readOnly}
            onChange={(next) => set("categoryIds", next)}
          />
        )}
      </Field>

      <Field label="Products" error={state.fieldErrors?.productIds}>
        {() => (
          <EntityPicker
            entity="product"
            value={links.productIds}
            choices={choices.products}
            max={MAX_CITY_LINKS}
            disabled={readOnly}
            onChange={(next) => set("productIds", next)}
          />
        )}
      </Field>

      <Field label="Specialties" error={state.fieldErrors?.specialtyIds}>
        {() => (
          <EntityPicker
            entity="specialty"
            value={links.specialtyIds}
            choices={choices.specialties}
            max={MAX_CITY_LINKS}
            disabled={readOnly}
            onChange={(next) => set("specialtyIds", next)}
          />
        )}
      </Field>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            Save featured items
          </Button>
        </div>
      )}
    </form>
  );
}
