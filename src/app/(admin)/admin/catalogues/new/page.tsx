import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { catalogueFileOptions } from "@/server/catalogues/service";
import { CatalogueForm } from "../catalogue-form";

export const metadata: Metadata = {
  title: "New catalogue",
  robots: { index: false, follow: false },
};

export default async function NewCataloguePage() {
  await requirePermission("PRODUCTS", "CREATE");
  const { can } = await currentPermissions();
  const [files, mediaOptions] = await Promise.all([catalogueFileOptions(), pickableMedia()]);

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New catalogue"
        description="Upload the PDF, give it a title and publish it to list it on the Catalogues page."
        backHref="/admin/catalogues"
        backLabel="Back to catalogues"
      />
      <Card>
        <CardContent>
          <CatalogueForm
            mode="create"
            version="new"
            files={files}
            mediaOptions={mediaOptions}
            canPublish={can("PRODUCTS", "PUBLISH")}
            canUpload={can("MEDIA", "CREATE")}
            readOnly={false}
            values={{ title: "", description: "", fileId: "", coverId: "", gated: true, status: "DRAFT" }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
