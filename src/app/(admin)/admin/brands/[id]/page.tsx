import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ExternalLink, Trash2 } from "lucide-react";

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
import { brandPath, findBrand } from "@/server/brands/service";
import { linkableCategories } from "@/server/categories/service";
import { deleteBrandAction } from "@/server/brands/actions";
import { BrandForm } from "../brand-form";

export const metadata: Metadata = {
  title: "Edit brand",
  robots: { index: false, follow: false },
};

export default async function EditBrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("BRANDS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const { error } = await searchParams;
  const [brand, categories, mediaOptions] = await Promise.all([
    findBrand(id),
    linkableCategories(),
    pickableMedia(),
  ]);
  if (!brand) notFound();

  const path = brandPath(brand.slug);

  return (
    <AdminPage>
      <AdminPageHeader
        title={brand.name}
        description={path}
        backHref="/admin/brands"
        backLabel="Back to brands"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={brand.status} />
            {brand.status === "PUBLISHED" ? (
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
            {can("BRANDS", "DELETE") ? (
              <form action={deleteBrandAction}>
                <input type="hidden" name="brandId" value={brand.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      {error === "has-products" ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Products still name this brand. Reassign or delete them before
            deleting the brand — which manufacturer made a device is not
            detail the catalogue can silently lose.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandForm
            mode="edit"
            version={brand.updatedAt.toISOString()}
            categories={categories}
            mediaOptions={mediaOptions}
            canPublish={can("BRANDS", "PUBLISH")}
            readOnly={!can("BRANDS", "EDIT")}
            values={{
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              shortDescription: brand.shortDescription ?? "",
              description: brand.description ?? "",
              websiteUrl: brand.websiteUrl ?? "",
              logoId: brand.logoId ?? "",
              bannerId: brand.bannerId ?? "",
              featured: brand.featured,
              status: brand.status,
              categoryIds: brand.categories.map(
                (link: { categoryId: string }) => link.categoryId,
              ),
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
