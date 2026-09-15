import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { linkableCategories } from "@/server/categories/service";
import { SolutionForm } from "../solution-form";

export const metadata: Metadata = {
  title: "New solution",
  robots: { index: false, follow: false },
};

export default async function NewSolutionPage() {
  await requirePermission("SOLUTIONS", "CREATE");
  const { can } = await currentPermissions();

  const [categories, mediaOptions] = await Promise.all([
    linkableCategories(),
    pickableMedia(),
  ]);

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New solution"
        description="Solutions start as a draft. Publish once the page has enough content to stand on its own."
        backHref="/admin/solutions"
        backLabel="Back to solutions"
      />

      <Card>
        <CardContent>
          <SolutionForm
            mode="create"
            version="new"
            categories={categories}
            mediaOptions={mediaOptions}
            canPublish={can("SOLUTIONS", "PUBLISH")}
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
