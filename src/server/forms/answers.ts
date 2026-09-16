import "server-only";

import { phoneSchema } from "@/lib/validation/leads";
import { MAX_ANSWER_LENGTH } from "@/lib/validation/forms";
import type { PublicFormField } from "./service";

/**
 * Checking a submission against the form as it is stored.
 *
 * The rules are built from the fields in the database, never from anything the
 * browser sent: a posted field the form does not have is not validated leniently,
 * it is simply not read. That is also why the answers are assembled here rather
 * than by iterating the FormData — iterating the submission would let a caller
 * decide which questions exist.
 */

export type Answers = Record<string, string | string[]>;

export type AnswerResult =
  | { ok: true; answers: Answers; fileFields: string[] }
  | { ok: false; fieldErrors: Record<string, string> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readOne(formData: FormData, key: string): string {
  const value = formData.get(`field_${key}`);
  return typeof value === "string" ? value.trim() : "";
}

export function collectAnswers(
  fields: PublicFormField[],
  formData: FormData,
): AnswerResult {
  const answers: Answers = {};
  const fieldErrors: Record<string, string> = {};
  const fileFields: string[] = [];

  for (const field of fields) {
    const name = `field_${field.key}`;

    if (field.type === "FILE") {
      const file = formData.get(name);
      const present = file instanceof File && file.size > 0;
      if (field.required && !present) {
        fieldErrors[field.key] = `${field.label} is required`;
      }
      // The file itself is stored by the caller; the answer records only that
      // one was attached, and is rewritten with its name once it is saved.
      if (present) fileFields.push(field.key);
      continue;
    }

    if (field.type === "CHECKBOX") {
      const ticked = formData.get(name) === "on";
      if (field.required && !ticked) {
        fieldErrors[field.key] = `${field.label} is required`;
      }
      answers[field.key] = ticked ? "Yes" : "No";
      continue;
    }

    const value = readOne(formData, name.slice("field_".length));

    if (!value) {
      if (field.required) fieldErrors[field.key] = `${field.label} is required`;
      else answers[field.key] = "";
      continue;
    }

    if (value.length > MAX_ANSWER_LENGTH) {
      fieldErrors[field.key] = `${field.label} is too long`;
      continue;
    }

    switch (field.type) {
      case "EMAIL":
        if (!EMAIL_PATTERN.test(value)) {
          fieldErrors[field.key] = "Enter a valid email address";
          continue;
        }
        break;
      case "PHONE": {
        const phone = phoneSchema.safeParse(value);
        if (!phone.success) {
          fieldErrors[field.key] = "Enter a phone number we can call";
          continue;
        }
        break;
      }
      case "NUMBER":
        if (!Number.isFinite(Number(value))) {
          fieldErrors[field.key] = "Enter a number";
          continue;
        }
        break;
      case "DATE":
        if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
          fieldErrors[field.key] = "Enter a date";
          continue;
        }
        break;
      case "SELECT":
      case "RADIO":
        // The answer has to be one of the choices the form defines. Otherwise a
        // dropdown is just a text box that looks like it is not one.
        if (!field.choices.includes(value)) {
          fieldErrors[field.key] = "Choose one of the options";
          continue;
        }
        break;
      default:
        break;
    }

    answers[field.key] = value;
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, answers, fileFields };
}
