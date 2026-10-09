import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Trash2 } from "lucide-react";

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
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { deleteRedirectAction } from "@/server/seo/actions";
import { RedirectForm } from "../redirect-form";

export const metadata: Metadata = {
  title: "Edit redirect",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export default async function EditRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("SEO_REDIRECTS", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;
  const { saved } = await searchParams;

  const row = await prisma.redirect.findUnique({
    where: { id },
    select: {
      id: true,
      fromPath: true,
      toPath: true,
      type: true,
      source: true,
      active: true,
      note: true,
      hits: true,
      lastHitAt: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });
  if (!row) notFound();

  const canEdit = can("SEO_REDIRECTS", "EDIT");
  const canDelete = can("SEO_REDIRECTS", "DELETE");

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title={row.fromPath}
        description={`→ ${row.toPath}`}
        backHref="/admin/seo/redirects"
        backLabel="Back to redirects"
        actions={
          canDelete ? (
            <form action={deleteRedirectAction}>
              <input type="hidden" name="redirectId" value={row.id} />
              <Button type="submit" variant="outline" size="sm">
                <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
                Delete
              </Button>
            </form>
          ) : null
        }
      />

      {saved === "created" ? (
        <p
          role="status"
          className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-center gap-2 rounded-md border p-3.5"
        >
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Redirect created. It takes effect within half a minute.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Redirect</CardTitle>
        </CardHeader>
        <CardContent>
          <RedirectForm
            mode="edit"
            version={row.updatedAt.toISOString()}
            readOnly={!canEdit}
            values={{
              id: row.id,
              fromPath: row.fromPath,
              toPath: row.toPath,
              type: row.type,
              active: row.active,
              note: row.note ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="text-body-sm grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
            <dt className="text-ink-muted">Made by</dt>
            <dd className="text-ink flex flex-wrap items-center gap-2">
              {row.source === "AUTOMATIC" ? (
                <Badge tone="info">Automatic</Badge>
              ) : (
                <Badge>Manual</Badge>
              )}
              {row.createdBy?.name ?? (row.source === "AUTOMATIC" ? "" : "—")}
            </dd>
            <dt className="text-ink-muted">Created</dt>
            <dd className="text-ink">{dateFormatter.format(row.createdAt)}</dd>
            <dt className="text-ink-muted">Followed</dt>
            <dd className="text-ink">
              {row.hits} time{row.hits === 1 ? "" : "s"}
              {row.lastHitAt
                ? `, last on ${dateFormatter.format(row.lastHitAt)}`
                : ""}
            </dd>
          </dl>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
