import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { linkableCategories } from "@/server/brands/service";
import { BrandForm } from "../brand-form";

export const metadata: Metadata = {
  title: "New brand",
  robots: { index: false, follow: false },
};

export default async function NewBrandPage() {
  await requirePermission("BRANDS", "CREATE");
  const { can } = await currentPermissions();

  const [categories, mediaOptions] = await Promise.all([
    linkableCategories(),
    pickableMedia(),
  ]);

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New brand"
        description="Brands start as a draft. Publish once the page has enough content to stand on its own."
        backHref="/admin/brands"
        backLabel="Back to brands"
      />

      <Card>
        <CardContent>
          <BrandForm
            mode="create"
            version="new"
            categories={categories}
            mediaOptions={mediaOptions}
            canPublish={can("BRANDS", "PUBLISH")}
            readOnly={false}
            values={{
              name: "",
              slug: "",
              shortDescription: "",
              description: "",
              websiteUrl: "",
              logoId: "",
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
