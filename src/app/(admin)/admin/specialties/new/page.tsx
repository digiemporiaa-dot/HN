import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { linkableCategories } from "@/server/categories/service";
import { SpecialtyForm } from "../specialty-form";

export const metadata: Metadata = {
  title: "New specialty",
  robots: { index: false, follow: false },
};

export default async function NewSpecialtyPage() {
  await requirePermission("SPECIALTIES", "CREATE");
  const { can } = await currentPermissions();

  const [categories, mediaOptions] = await Promise.all([
    linkableCategories(),
    pickableMedia(),
  ]);

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New specialty"
        description="Specialties start as a draft. Publish once the page has enough content to stand on its own."
        backHref="/admin/specialties"
        backLabel="Back to specialties"
      />

      <Card>
        <CardContent>
          <SpecialtyForm
            mode="create"
            version="new"
            categories={categories}
            mediaOptions={mediaOptions}
            canPublish={can("SPECIALTIES", "PUBLISH")}
            readOnly={false}
            values={{
              name: "",
              slug: "",
              shortDescription: "",
              description: "",
              imageId: "",
              bannerId: "",
              featured: false,
              status: "DRAFT",
              categoryIds: [],
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
