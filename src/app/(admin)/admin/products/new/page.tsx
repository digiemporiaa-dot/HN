import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { productTaxonomies } from "@/server/products/service";
import {
  createProductAction,
  updateProductAction,
} from "@/server/products/actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "New product",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  await requirePermission("PRODUCTS", "CREATE");
  const { can } = await currentPermissions();

  const [taxonomies, mediaOptions] = await Promise.all([
    productTaxonomies(),
    pickableMedia(),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="New product"
        description="Products start as a draft. Publish once the page carries enough for a buyer to ask for a quotation."
        backHref="/admin/products"
        backLabel="Back to products"
      />

      <Card>
        <CardContent>
          <ProductForm
            mode="create"
            version="new"
            createAction={createProductAction}
            updateAction={updateProductAction}
            categories={taxonomies.categories}
            brands={taxonomies.brands}
            specialties={taxonomies.specialties}
            solutions={taxonomies.solutions}
            mediaOptions={mediaOptions}
            canPublish={can("PRODUCTS", "PUBLISH")}
            readOnly={false}
            values={{
              name: "",
              slug: "",
              modelNumber: "",
              shortDescription: "",
              description: "",
              categoryId: "",
              brandId: "",
              primaryImageId: "",
              galleryIds: [],
              specialtyIds: [],
              solutionIds: [],
              featured: false,
              status: "DRAFT",
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
