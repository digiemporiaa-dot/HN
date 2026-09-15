import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Boxes, Info, Star } from "lucide-react";

import { buttonStyles, EmptyState, StatusBadge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { publicUrlForKey } from "@/server/storage/paths";
import {
  PRODUCT_LIST_SELECT,
  productTaxonomies,
  type ProductRow,
} from "@/server/products/service";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { DeletedProducts } from "./deleted-products";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

/** Whitelisted so an arbitrary parameter can never reach the query builder. */
const SORTABLE = {
  name: "name",
  status: "status",
  order: "order",
  updatedAt: "updatedAt",
} as const;

type StatusValue = (typeof CONTENT_STATUS_OPTIONS)[number]["value"];

const STATUSES = new Set<string>(
  CONTENT_STATUS_OPTIONS.map((option) => option.value),
);

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("PRODUCTS", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in SORTABLE
      ? SORTABLE[sortKey as keyof typeof SORTABLE]
      : "name";
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  const taxonomies = await productTaxonomies();

  // Every filter is checked against what exists rather than passed through: an
  // id from a hand-edited URL must not reach the query builder.
  const categoryIds = new Set(taxonomies.categories.map((row) => row.id));
  const brandIds = new Set(taxonomies.brands.map((row) => row.id));
  const rawCategory = readStringParam(params.category);
  const rawBrand = readStringParam(params.brand);
  const rawStatus = readStringParam(params.status);
  const categoryId =
    rawCategory && categoryIds.has(rawCategory) ? rawCategory : undefined;
  const brandId = rawBrand && brandIds.has(rawBrand) ? rawBrand : undefined;
  const status =
    rawStatus && STATUSES.has(rawStatus)
      ? (rawStatus as StatusValue)
      : undefined;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(categoryId ? { categoryId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
            { modelNumber: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows, deletedCount] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: PRODUCT_LIST_SELECT,
    }),
    prisma.product.count({ where: { deletedAt: { not: null } } }),
  ]);

  const filtered = Boolean(query || categoryId || brandId || status);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Products"
        description="The catalogue. Every product is filed under one category and quoted rather than priced."
        actions={
          can("PRODUCTS", "CREATE") ? (
            <Link href="/admin/products/new" className={buttonStyles()}>
              <Boxes aria-hidden="true" className="size-4" />
              New product
            </Link>
          ) : null
        }
      />

      {params.error === "category-gone" ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            That product cannot be restored: its category has been deleted.
            Restore the category first, and the product can come back with a
            page to live on.
          </span>
        </div>
      ) : null}

      {taxonomies.categories.length === 0 ? (
        <div className="border-line bg-surface-muted text-body-sm text-ink-muted flex items-start gap-2.5 rounded-md border p-3.5">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            A product has to be filed under a category. Create one under
            Categories before adding products.
          </span>
        </div>
      ) : null}

      <DataTable<ProductRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/products/${row.id}`}
        basePath="/admin/products"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="product"
        toolbar={
          <>
            <TableSearch placeholder="Search name, slug or model" />
            <TableFilter
              paramName="category"
              label="Filter by category"
              allLabel="All categories"
              options={taxonomies.categories.map((option) => ({
                value: option.id,
                label: option.depth > 0 ? `  — ${option.name}` : option.name,
              }))}
            />
            <TableFilter
              paramName="brand"
              label="Filter by brand"
              allLabel="All brands"
              options={taxonomies.brands.map((option) => ({
                value: option.id,
                label: option.name,
              }))}
            />
            <TableFilter
              paramName="status"
              label="Filter by status"
              allLabel="Any status"
              options={CONTENT_STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.short,
              }))}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={filtered ? "No matching products" : "No products yet"}
            description={
              filtered
                ? "Try a different search, or clear the filters."
                : "Add the first product to start building the catalogue."
            }
            action={
              filtered ? (
                <Link
                  href={buildQueryHref("/admin/products", {}, {})}
                  className={buttonStyles({ variant: "outline" })}
                >
                  Clear filters
                </Link>
              ) : null
            }
          />
        }
        columns={[
          {
            key: "name",
            header: "Product",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex items-center gap-3">
                {row.primaryImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- served
                     from our own media route at its stored size */
                  <img
                    src={publicUrlForKey(row.primaryImage.storageKey)}
                    alt=""
                    className="border-line size-9 shrink-0 rounded-md border object-contain"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="border-line bg-surface-muted size-9 shrink-0 rounded-md border"
                  />
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body-sm text-ink flex items-center gap-1.5 font-medium">
                    {row.name}
                    {row.featured ? (
                      <Star
                        aria-label="Featured"
                        className="text-warning-700 size-3.5 shrink-0"
                      />
                    ) : null}
                  </span>
                  <span className="text-caption text-ink-muted break-all">
                    {row.modelNumber ? `${row.modelNumber} · ` : ""}
                    /products/{row.slug}
                  </span>
                </div>
              </div>
            ),
          },
          {
            key: "category",
            header: "Category",
            cell: (row) => row.category.name,
          },
          {
            key: "brand",
            header: "Brand",
            priority: "meta",
            cell: (row) => row.brand?.name ?? "—",
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "updatedAt",
            header: "Last edited",
            sortable: true,
            priority: "meta",
            cell: (row) => dateFormatter.format(row.updatedAt),
          },
        ]}
      />

      {deletedCount > 0 && can("PRODUCTS", "EDIT") ? <DeletedProducts /> : null}
    </AdminPage>
  );
}
