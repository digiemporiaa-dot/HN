import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Trash2 } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { assignableStaff, findLead } from "@/server/leads/service";
import { leadActivities } from "@/server/leads/activity";
import { categoryPath } from "@/server/categories/service";
import {
  addLeadNoteAction,
  deleteLeadAction,
  updateLeadAction,
} from "@/server/leads/actions";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
} from "@/lib/validation/leads";
import { productPath } from "@/server/products/service";
import { LeadNoteForm, LeadWorkflowForm } from "../lead-forms";

export const metadata: Metadata = {
  title: "Enquiry",
  robots: { index: false, follow: false },
};

const ACTIVITY_LABELS: Record<string, string> = {
  CREATED: "Received",
  STAGE_CHANGED: "Stage",
  PRIORITY_CHANGED: "Priority",
  ASSIGNED: "Owner",
  NOTE_ADDED: "Note",
  DOCUMENT_DOWNLOADED: "Download",
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("LEADS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const [lead, staff] = await Promise.all([findLead(id), assignableStaff()]);
  if (!lead) notFound();
  const activities = await leadActivities(lead.id);
  if (!lead) notFound();

  const facts: Array<[string, React.ReactNode]> = [
    [
      "Email",
      <a
        key="e"
        href={`mailto:${lead.email}`}
        className="text-primary underline underline-offset-4"
      >
        {lead.email}
      </a>,
    ],
    ...(lead.phone
      ? ([
          [
            "Phone",
            <a
              key="p"
              href={`tel:${lead.phone.replace(/\s+/g, "")}`}
              className="text-primary underline underline-offset-4"
            >
              {lead.phone}
            </a>,
          ],
        ] as Array<[string, React.ReactNode]>)
      : []),
    ...(lead.organisation
      ? ([["Organisation", lead.organisation]] as Array<
          [string, React.ReactNode]
        >)
      : []),
    ...(lead.city
      ? ([["City", lead.city]] as Array<[string, React.ReactNode]>)
      : []),
    ["Source", LEAD_SOURCE_LABELS[lead.source] ?? lead.source],
    ...(lead.product
      ? ([
          [
            "Product",
            <Link
              key="pr"
              href={productPath(lead.product.slug)}
              className="text-primary underline underline-offset-4"
            >
              {lead.productName ?? lead.product.name}
            </Link>,
          ],
        ] as Array<[string, React.ReactNode]>)
      : lead.productName
        ? ([["Product", lead.productName]] as Array<[string, React.ReactNode]>)
        : []),
    ...(lead.category
      ? ([
          [
            "Category",
            <Link
              key="ct"
              href={categoryPath(
                lead.category.slug,
                lead.category.parent?.slug,
              )}
              className="text-primary underline underline-offset-4"
            >
              {lead.categoryName ?? lead.category.name}
            </Link>,
          ],
        ] as Array<[string, React.ReactNode]>)
      : lead.categoryName
        ? ([["Category", lead.categoryName]] as Array<
            [string, React.ReactNode]
          >)
        : []),
    ...(lead.landingPage
      ? ([
          [
            "Landing page",
            <Link
              key="lp"
              href={lead.landingPage}
              className="text-primary break-all underline underline-offset-4"
            >
              {lead.landingPage}
            </Link>,
          ],
        ] as Array<[string, React.ReactNode]>)
      : []),
    [
      "Priority",
      LEAD_PRIORITIES.find((p) => p.value === lead.priority)?.label ??
        lead.priority,
    ],
    ["Received", dateFormatter.format(lead.createdAt)],
  ];

  // Shown only when there is something to show. An empty campaign block on
  // every organic enquiry would be five dashes nobody reads.
  const campaign: Array<[string, string]> = (
    [
      ["Source", lead.utmSource],
      ["Medium", lead.utmMedium],
      ["Campaign", lead.utmCampaign],
      ["Term", lead.utmTerm],
      ["Content", lead.utmContent],
    ] as Array<[string, string | null]>
  ).flatMap(([label, value]) =>
    value ? [[label, value] as [string, string]] : [],
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title={lead.name}
        description={`${lead.reference} · ${LEAD_SOURCE_LABELS[lead.source] ?? lead.source}`}
        backHref="/admin/leads"
        backLabel="Back to leads"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="neutral">
              {LEAD_STATUSES.find((s) => s.value === lead.status)?.label ??
                lead.status}
            </Badge>
            {can("LEADS", "DELETE") ? (
              <form action={deleteLeadAction}>
                <input type="hidden" name="leadId" value={lead.id} />
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

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Enquiry</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-caption text-ink-subtle">{label}</dt>
                    <dd className="text-body-sm text-ink break-words">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {lead.message ? (
                <div className="border-line flex flex-col gap-1.5 border-t pt-4">
                  <span className="text-caption text-ink-subtle">Message</span>
                  <p className="text-body-sm text-ink whitespace-pre-wrap">
                    {lead.message}
                  </p>
                </div>
              ) : null}

              {lead.consentedAt ? (
                <p className="text-caption text-ink-subtle border-line border-t pt-4">
                  Consent given {dateFormatter.format(lead.consentedAt)} — “
                  {lead.consentText}”
                </p>
              ) : null}
            </CardContent>
          </Card>

          {lead.items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Products requested ({lead.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {/* The name and model number shown are the ones stored when the
                    request arrived, not the catalogue's current ones: what a
                    hospital asked for is a fact about that day. The link is
                    offered only while the product is still there to link to. */}
                <ul className="divide-line divide-y">
                  {lead.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="text-body-sm text-ink shrink-0 font-medium tabular-nums">
                          {item.quantity} ×
                        </span>
                        <span className="text-body-sm text-ink">
                          {item.product &&
                          !item.product.deletedAt &&
                          item.product.status === "PUBLISHED" ? (
                            <Link
                              href={productPath(item.product.slug)}
                              className="text-primary underline underline-offset-4"
                            >
                              {item.productName}
                            </Link>
                          ) : (
                            item.productName
                          )}
                          {item.modelNumber ? (
                            <span className="text-ink-subtle">
                              {" "}
                              · {item.modelNumber}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      {item.notes ? (
                        <p className="text-caption text-ink-muted whitespace-pre-wrap pl-9">
                          {item.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {lead.formSubmission ? (
            <Card>
              <CardHeader>
                <CardTitle>{lead.formSubmission.form.name} — answers</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Walked in the form's own field order, so the answers read
                    the way the form did. A key with no field left is still
                    shown: an answer somebody gave does not stop existing
                    because the question was removed. */}
                <dl className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(
                    (lead.formSubmission.answers ?? {}) as Record<
                      string,
                      unknown
                    >,
                  ).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <dt className="text-caption text-ink-subtle">
                        {lead.formSubmission?.form.fields.find(
                          (field) => field.key === key,
                        )?.label ?? key}
                      </dt>
                      <dd className="text-body-sm text-ink break-words">
                        {Array.isArray(value)
                          ? value.join(", ")
                          : String(value || "—")}
                      </dd>
                    </div>
                  ))}
                </dl>

                {lead.formSubmission.files.length > 0 ? (
                  <ul className="border-line flex flex-wrap gap-3 border-t pt-4">
                    {lead.formSubmission.files.map((file) => (
                      <li key={file.id}>
                        <a
                          href={`/api/admin/forms/files/${file.id}`}
                          className="text-body-sm text-primary underline underline-offset-4"
                        >
                          {file.originalName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {can("LEADS", "EDIT") ? (
                <LeadNoteForm
                  leadId={lead.id}
                  action={addLeadNoteAction}
                  version={`${lead.notes.length}:${lead.notes[0]?.id ?? "none"}`}
                />
              ) : null}

              {lead.notes.length === 0 ? (
                <p className="text-body-sm text-ink-muted">
                  Nothing recorded yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {lead.notes.map((note) => (
                    <li
                      key={note.id}
                      className="border-line flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <span className="text-caption text-ink-subtle">
                        {note.authorName} ·{" "}
                        {dateFormatter.format(note.createdAt)}
                      </span>
                      <p className="text-body-sm text-ink whitespace-pre-wrap">
                        {note.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadWorkflowForm
                leadId={lead.id}
                status={lead.status}
                priority={lead.priority}
                assignedToId={lead.assignedToId ?? ""}
                version={lead.updatedAt.toISOString()}
                staff={staff}
                action={updateLeadAction}
                readOnly={!can("LEADS", "EDIT")}
                canAssign={can("LEADS", "ASSIGN")}
              />
            </CardContent>
          </Card>

          {campaign.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3">
                  {campaign.map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <dt className="text-caption text-ink-subtle">{label}</dt>
                      <dd className="text-body-sm text-ink break-all">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-body-sm text-ink-muted">
                  Nothing recorded yet.
                </p>
              ) : (
                // Append-only, newest first. A stage moved back and forth is a
                // fact about how the deal went, so nothing here is tidied away.
                <ol className="flex flex-col gap-4">
                  {activities.map((entry) => (
                    <li key={entry.id} className="flex flex-col gap-0.5">
                      <span className="text-caption text-ink-subtle">
                        {ACTIVITY_LABELS[entry.kind] ?? entry.kind} ·{" "}
                        {dateFormatter.format(entry.createdAt)}
                        {entry.actorName ? ` · ${entry.actorName}` : ""}
                      </span>
                      <span className="text-body-sm text-ink">
                        {entry.summary}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {lead.grants.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Documents sent</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {lead.grants.map((grant) => (
                    <li key={grant.id} className="flex items-start gap-3">
                      <Download
                        aria-hidden="true"
                        className="text-ink-subtle mt-0.5 size-4 shrink-0"
                      />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-body-sm text-ink font-medium">
                          {grant.document.title}
                        </span>
                        <span className="text-caption text-ink-subtle">
                          {grant.downloadCount === 0
                            ? "Not opened yet"
                            : `Opened ${grant.downloadCount} time${grant.downloadCount === 1 ? "" : "s"}`}
                          {grant.lastDownloadedAt
                            ? `, last ${dateFormatter.format(grant.lastDownloadedAt)}`
                            : ""}
                          {grant.expiresAt.getTime() < Date.now()
                            ? " · link expired"
                            : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
