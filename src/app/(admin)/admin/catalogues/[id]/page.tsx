import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle, StatusBadge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { CATALOGUES_PATH, catalogueFileOptions, findCatalogue } from "@/server/catalogues/service";
import { deleteCatalogueAction } from "@/server/catalogues/actions";
import { CatalogueForm } from "../catalogue-form";

export const metadata: Metadata = {
  title: "Edit catalogue",
  robots: { index: false, follow: false },
};

export default async function EditCataloguePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("PRODUCTS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const [catalogue, files, mediaOptions] = await Promise.all([
    findCatalogue(id),
    catalogueFileOptions(),
    pickableMedia(),
  ]);
  if (!catalogue) notFound();

  return (
    <AdminPage>
      <AdminPageHeader
        title={catalogue.title}
        description={catalogue.gated ? "Download form first, then the PDF" : "Downloads directly"}
        backHref="/admin/catalogues"
        backLabel="Back to catalogues"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={catalogue.status} />
            {catalogue.status === "PUBLISHED" ? (
              <Link
                href={CATALOGUES_PATH}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                View page
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
            {can("PRODUCTS", "DELETE") ? (
              <form action={deleteCatalogueAction}>
                <input type="hidden" name="catalogueId" value={catalogue.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
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
          <CatalogueForm
            mode="edit"
            version={catalogue.updatedAt.toISOString()}
            files={files}
            mediaOptions={mediaOptions}
            canPublish={can("PRODUCTS", "PUBLISH")}
            canUpload={can("MEDIA", "CREATE")}
            readOnly={!can("PRODUCTS", "EDIT")}
            values={{
              id: catalogue.id,
              title: catalogue.title,
              description: catalogue.description ?? "",
              fileId: catalogue.fileId,
              coverId: catalogue.coverId ?? "",
              gated: catalogue.gated,
              status: catalogue.status,
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
