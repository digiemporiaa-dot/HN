import { prisma } from "@/server/db";
import { parseOptions } from "@/lib/validation/forms";

export const FORM_LIST_SELECT = {
  id: true,
  key: true,
  name: true,
  status: true,
  updatedAt: true,
  _count: { select: { fields: true, submissions: true } },
} as const;

export type FormRow = {
  id: string;
  key: string;
  name: string;
  status: string;
  updatedAt: Date;
  _count: { fields: number; submissions: number };
};

export async function findForm(id: string) {
  return prisma.form.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      successMessage: true,
      submitLabel: true,
      notifyEmail: true,
      status: true,
      updatedAt: true,
      fields: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          key: true,
          type: true,
          label: true,
          placeholder: true,
          help: true,
          required: true,
          hidden: true,
          options: true,
          mapsTo: true,
        },
      },
      _count: { select: { submissions: true } },
    },
  });
}

/**
 * A published form, as a visitor may see it.
 *
 * Hidden fields are dropped here rather than in the renderer, so the same list
 * the page draws is the list the submission is checked against: a field nobody
 * was shown is a field nobody can answer.
 */
export async function publicForm(key: string) {
  const form = await prisma.form.findFirst({
    where: { key, deletedAt: null, status: "PUBLISHED" },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      successMessage: true,
      submitLabel: true,
      notifyEmail: true,
      fields: {
        where: { hidden: false },
        orderBy: { order: "asc" },
        select: {
          id: true,
          key: true,
          type: true,
          label: true,
          placeholder: true,
          help: true,
          required: true,
          options: true,
          mapsTo: true,
        },
      },
    },
  });
  if (!form) return null;

  return {
    ...form,
    fields: form.fields.map((field) => ({
      ...field,
      choices: parseOptions(field.options),
    })),
  };
}

export type PublicForm = NonNullable<Awaited<ReturnType<typeof publicForm>>>;
export type PublicFormField = PublicForm["fields"][number];

/** Forms an editor may drop onto a page. Published only: a draft has no page. */
export async function embeddableForms() {
  return prisma.form.findMany({
    where: { deletedAt: null, status: "PUBLISHED" },
    orderBy: { name: "asc" },
    select: { key: true, name: true },
  });
}

export async function formSubmissions(formId: string, take = 100) {
  return prisma.formSubmission.findMany({
    where: { formId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      answers: true,
      createdAt: true,
      files: {
        select: {
          id: true,
          fieldKey: true,
          originalName: true,
          sizeBytes: true,
          mimeType: true,
        },
      },
    },
  });
}
