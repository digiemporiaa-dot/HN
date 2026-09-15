import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import {
  findProduct,
  productPath,
  productTaxonomies,
} from "@/server/products/service";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/server/products/actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("PRODUCTS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const [product, taxonomies, mediaOptions] = await Promise.all([
    findProduct(id),
    productTaxonomies(),
    pickableMedia(),
  ]);
  if (!product) notFound();

  const path = productPath(product.slug);

  return (
    <AdminPage>
      <AdminPageHeader
        title={product.name}
        description={`${product.category.name} · ${path}`}
        backHref="/admin/products"
        backLabel="Back to products"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={product.status} />
            {product.status === "PUBLISHED" ? (
              <Link
                href={path}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                View page
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
            {can("PRODUCTS", "DELETE") ? (
              <form action={deleteProductAction}>
                <input type="hidden" name="productId" value={product.id} />
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

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            mode="edit"
            version={product.updatedAt.toISOString()}
            createAction={createProductAction}
            updateAction={updateProductAction}
            categories={taxonomies.categories}
            brands={taxonomies.brands}
            specialties={taxonomies.specialties}
            solutions={taxonomies.solutions}
            mediaOptions={mediaOptions}
            canPublish={can("PRODUCTS", "PUBLISH")}
            readOnly={!can("PRODUCTS", "EDIT")}
            values={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              modelNumber: product.modelNumber ?? "",
              shortDescription: product.shortDescription ?? "",
              description: product.description ?? "",
              categoryId: product.categoryId,
              brandId: product.brandId ?? "",
              primaryImageId: product.primaryImageId ?? "",
              galleryIds: product.images.map(
                (image: { mediaId: string }) => image.mediaId,
              ),
              specialtyIds: product.specialties.map(
                (link: { specialtyId: string }) => link.specialtyId,
              ),
              solutionIds: product.solutions.map(
                (link: { solutionId: string }) => link.solutionId,
              ),
              featured: product.featured,
              status: product.status,
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
