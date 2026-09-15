import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { selectableParents } from "@/server/categories/service";
import { pickableMedia } from "@/server/media/pickable";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = {
  title: "New category",
  robots: { index: false, follow: false },
};

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("CATEGORIES", "CREATE");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const requestedParent =
    typeof params.parent === "string" ? params.parent : "";

  const [parents, mediaOptions] = await Promise.all([
    selectableParents(),
    pickableMedia(),
  ]);

  // Only honour a parent that actually exists, so a stale link cannot preselect
  // a category that has since been deleted.
  const parentId = parents.some((parent) => parent.id === requestedParent)
    ? requestedParent
    : "";

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title={parentId ? "New subcategory" : "New category"}
        description="Categories start as a draft. Publish once the page has enough content to stand on its own."
        backHref={parentId ? `/admin/categories/${parentId}` : "/admin/categories"}
        backLabel="Back"
      />

      <Card>
        <CardContent>
          <CategoryForm
            mode="create"
            parents={parents}
            mediaOptions={mediaOptions}
            canPublish={can("CATEGORIES", "PUBLISH")}
            readOnly={false}
            version="new"
            values={{
              name: "",
              slug: "",
              shortDescription: "",
              description: "",
              imageId: "",
              bannerId: "",
              featured: false,
              status: "DRAFT",
              parentId,
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
