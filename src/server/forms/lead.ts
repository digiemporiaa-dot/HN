import "server-only";

import type { Answers } from "./answers";
import type { PublicFormField } from "./service";

/**
 * Turning a built form's answers into a lead.
 *
 * Only the mappings an administrator set are used. Guessing from labels was the
 * alternative and it is worse than it looks: a form with two email boxes, or one
 * whose "Name" question asks for the machine's name rather than the person's,
 * is completely ordinary, and guessing wrong files an enquiry under the wrong
 * customer — which nobody notices until they ring the wrong hospital.
 *
 * A form with no email mapping produces no lead at all. That is the right answer
 * for a survey, and it is a decision the administrator made rather than one this
 * code made for them.
 */
export type MappedLead = {
  name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  city: string | null;
  message: string | null;
};

const asText = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value.join(", ") : (value ?? "");

export function leadFromAnswers(
  fields: PublicFormField[],
  answers: Answers,
): MappedLead | null {
  const byMapping = new Map<string, string>();

  for (const field of fields) {
    if (field.mapsTo === "NONE") continue;
    // The first field with a given mapping wins. Two questions both marked as
    // the email address is a mistake in the form, not something to merge.
    if (byMapping.has(field.mapsTo)) continue;
    const value = asText(answers[field.key]).trim();
    if (value) byMapping.set(field.mapsTo, value);
  }

  const email = byMapping.get("EMAIL");
  if (!email) return null;

  return {
    // A lead has to be filed under somebody. Where the form never asked for a
    // name, the address is what we have, and saying so is better than inventing
    // a person called "Unknown".
    name: byMapping.get("NAME") || email,
    email,
    phone: byMapping.get("PHONE") ?? null,
    organisation: byMapping.get("ORGANISATION") ?? null,
    city: byMapping.get("CITY") ?? null,
    message: byMapping.get("MESSAGE") ?? null,
  };
}
