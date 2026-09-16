import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Paperclip, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  deleteFormAction,
  saveFormFieldsAction,
  updateFormAction,
} from "@/server/forms/actions";
import { findForm, formSubmissions } from "@/server/forms/service";
import { FormDetails } from "../form-details";
import { FieldBuilder, type BuilderField } from "./field-builder";

export const metadata: Metadata = {
  title: "Edit form",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("FORMS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const form = await findForm(id);
  if (!form) notFound();

  const submissions = await formSubmissions(form.id);
  const readOnly = !can("FORMS", "EDIT");

  const fields: BuilderField[] = form.fields.map((field) => ({
    key: field.key,
    type: field.type,
    label: field.label,
    placeholder: field.placeholder ?? "",
    help: field.help ?? "",
    required: field.required,
    hidden: field.hidden,
    options: field.options ?? "",
    mapsTo: field.mapsTo,
  }));

  // Changes whenever a save lands, which is what resyncs an open builder.
  const fieldsVersion = `${form.fields.length}:${form.fields
    .map((field) => field.id)
    .join(":")}`;

  // Labels for the submissions table, including for questions since removed:
  // an answer collected under a key that no longer has a field is still an
  // answer somebody gave.
  const labels = new Map(form.fields.map((field) => [field.key, field.label]));

  return (
    <AdminPage>
      <AdminPageHeader
        title={form.name}
        description={`Key: ${form.key}`}
        backHref="/admin/forms"
        backLabel="Back to forms"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={form.status} />
            {can("FORMS", "DELETE") ? (
              <form action={deleteFormAction}>
                <input type="hidden" name="formId" value={form.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2
                    aria-hidden="true"
                    className="text-danger-600 size-4"
                  />
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FormDetails
            mode="edit"
            action={updateFormAction}
            canPublish={can("FORMS", "EDIT")}
            readOnly={readOnly}
            version={form.updatedAt.toISOString()}
            values={{
              id: form.id,
              name: form.name,
              key: form.key,
              description: form.description ?? "",
              successMessage: form.successMessage ?? "",
              submitLabel: form.submitLabel ?? "",
              notifyEmail: form.notifyEmail ?? "",
              status: form.status,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldBuilder
            formId={form.id}
            fields={fields}
            version={fieldsVersion}
            saveAction={saveFormFieldsAction}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submissions ({form._count.submissions})</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <EmptyState
              title="Nothing yet"
              description="Submissions appear here as they arrive, and a notification goes out for each one."
            />
          ) : (
            <ul className="divide-line divide-y">
              {submissions.map((submission) => {
                const answers = (submission.answers ?? {}) as Record<
                  string,
                  unknown
                >;

                return (
                  <li
                    key={submission.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0"
                  >
                    <span className="text-caption text-ink-subtle">
                      {dateFormatter.format(submission.createdAt)}
                    </span>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(answers).map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-0.5">
                          <dt className="text-caption text-ink-subtle">
                            {labels.get(key) ?? key}
                          </dt>
                          <dd className="text-body-sm text-ink break-words">
                            {Array.isArray(value)
                              ? value.join(", ")
                              : String(value || "—")}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {submission.files.length > 0 ? (
                      <ul className="flex flex-wrap gap-3">
                        {submission.files.map((file) => (
                          <li
                            key={file.id}
                            className="text-body-sm text-ink-muted inline-flex items-center gap-1.5"
                          >
                            <Paperclip
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            <a
                              href={`/api/admin/forms/files/${file.id}`}
                              className="text-primary underline underline-offset-4"
                            >
                              {file.originalName}
                            </a>
                            <span className="text-ink-subtle">
                              {fileSize(file.sizeBytes)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
