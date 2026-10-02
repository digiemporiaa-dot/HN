import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ExternalLink, Trash2 } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { getSiteSettings } from "@/server/settings/service";
import { deleteOverrideAction } from "@/server/seo/override-actions";
import { appUrl } from "@/lib/site-config";
import { OverrideForm } from "../override-form";

export const metadata: Metadata = {
  title: "Edit metadata override",
  robots: { index: false, follow: false },
};

export default async function EditOverridePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("SEO", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;
  const query = await searchParams;

  const [row, mediaOptions, settings] = await Promise.all([
    prisma.seoOverride.findUnique({
      where: { id },
      select: {
        id: true,
        path: true,
        title: true,
        titleAbsolute: true,
        description: true,
        canonical: true,
        noindex: true,
        ogImageId: true,
        note: true,
        updatedAt: true,
        updatedBy: { select: { name: true } },
      },
    }),
    pickableMedia(),
    getSiteSettings(),
  ]);
  if (!row) notFound();

  const canEdit = can("SEO", "EDIT");
  // Removing a noindex override puts the page back into the index.
  const canDelete = canEdit && (!row.noindex || can("SEO", "PUBLISH"));

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title={row.path}
        description={`Last changed ${new Intl.DateTimeFormat("en-IN", {
          dateStyle: "medium",
          timeZone: "Asia/Kolkata",
        }).format(
          row.updatedAt,
        )}${row.updatedBy ? ` by ${row.updatedBy.name}` : ""}`}
        backHref="/admin/seo/metadata"
        backLabel="Back to page metadata"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={row.path}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
            >
              View page
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
            {canDelete ? (
              <form action={deleteOverrideAction}>
                <input type="hidden" name="overrideId" value={row.id} />
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

      {query.saved === "created" ? (
        <p
          role="status"
          className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-center gap-2 rounded-md border p-3.5"
        >
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          Override created.
          {query.unpublished === "1"
            ? ` Nothing is published at ${row.path} yet; it applies once something is.`
            : ""}
        </p>
      ) : null}

      <Card>
        <CardContent>
          <OverrideForm
            mode="edit"
            version={row.updatedAt.toISOString()}
            readOnly={!canEdit}
            canPublish={can("SEO", "PUBLISH")}
            mediaOptions={mediaOptions}
            titleTemplate={settings.seo.titleTemplate}
            siteUrl={appUrl()}
            values={{
              id: row.id,
              path: row.path,
              title: row.title ?? "",
              titleAbsolute: row.titleAbsolute,
              description: row.description ?? "",
              canonical: row.canonical ?? "",
              noindex: row.noindex,
              ogImageId: row.ogImageId ?? "",
              note: row.note ?? "",
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
