import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Breadcrumb,
  Container,
  EmptyState,
  Pagination,
  Section,
  SectionHeader,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { RichText } from "@/cms/rich-text";
import { buildQueryHref, readPageParam } from "@/lib/utils/query";
import { visitorHasPermission } from "@/server/permissions";
import { categoryPath } from "@/server/categories/service";
import { brandPath } from "@/server/brands/service";
import {
  publicCategory,
  publishedCategoryPaths,
} from "@/server/catalogue/public";
import { publicProductListing } from "@/server/products/public";

const PAGE_SIZE = 16;

type RouteParams = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/* eslint-disable @next/next/no-img-element -- catalogue images are served from
   our own media route at their stored size. */

export async function generateStaticParams() {
  const paths = await publishedCategoryPaths();
  return paths.map((path) => ({ path }));
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { path } = await params;
  const category = await publicCategory(path);
  if (!category) return { title: "Category not found" };

  const description =
    category.shortDescription ??
    `Equipment in ${category.name}, supplied and installed by us.`;

  return {
    title: category.name,
    description,
    alternates: {
      canonical: categoryPath(category.slug, category.parent?.slug),
    },
    openGraph: {
      title: category.name,
      description,
      type: "website",
      images: category.banner ? [{ url: category.banner.url }] : undefined,
    },
    // Spread rather than set to undefined, so a published page inherits the
    // site-wide robots setting instead of replacing it.
    ...(category.status === "PUBLISHED"
      ? {}
      : { robots: { index: false, follow: false } }),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: RouteParams) {
  const { path } = await params;
  const query = await searchParams;
  const page = readPageParam(query.page);

  const category = await publicCategory(path);
  if (!category) notFound();

  const published = category.status === "PUBLISHED";
  if (!published && !(await visitorHasPermission("CATEGORIES", "VIEW"))) {
    notFound();
  }

  // A parent lists everything under it, including what sits in its
  // subcategories — that is what a visitor opening it expects to find.
  const { total, products } = await publicProductListing({
    categorySlug: category.slug,
    page,
    pageSize: PAGE_SIZE,
  });

  const here = categoryPath(category.slug, category.parent?.slug);

  return (
    <>
      {published ? null : (
        <div className="bg-warning-50 border-warning-100 border-b">
          <Container className="text-body-sm text-warning-700 flex flex-wrap items-center justify-between gap-3 py-3">
            <span>
              Preview — this category is {category.status.toLowerCase()} and is
              not visible to the public.
            </span>
            <Link
              href={`/admin/categories/${category.id}`}
              className="underline underline-offset-4"
            >
              Edit category
            </Link>
          </Container>
        </div>
      )}

      {category.banner ? (
        <div className="bg-surface-muted">
          <img
            src={category.banner.url}
            alt={category.banner.alt}
            className="h-48 w-full object-cover sm:h-64"
          />
        </div>
      ) : null}

      <Container className="pt-6">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            ...(category.parent
              ? [
                  {
                    label: category.parent.name,
                    href: categoryPath(category.parent.slug),
                  },
                ]
              : []),
            { label: category.name },
          ]}
        />
      </Container>

      <Section spacing="normal" container="standard">
        <div className="flex flex-col gap-5">
          <h1 className="text-h1 text-ink">{category.name}</h1>
          {category.shortDescription ? (
            <p className="text-body-lg text-ink-muted max-w-[70ch]">
              {category.shortDescription}
            </p>
          ) : null}
          {category.description ? (
            <div className="prose-hn max-w-[70ch]">
              <RichText value={category.description} />
            </div>
          ) : null}

          {category.brands.length > 0 ? (
            <div className="border-line flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-5">
              <span className="text-caption text-ink-subtle">Brands</span>
              {category.brands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={brandPath(brand.slug)}
                  className="text-body-sm text-primary underline underline-offset-4"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </Section>

      {category.children.length > 0 ? (
        <Section spacing="normal" container="standard" background="light">
          <SectionHeader title="Browse by type" align="left" />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {category.children.map((child) => (
              <li key={child.id}>
                <Link
                  href={categoryPath(child.slug, category.slug)}
                  className="border-line bg-surface hover:border-line-strong group flex h-full gap-4 rounded-lg border p-5 transition-colors"
                >
                  {child.image ? (
                    <img
                      src={child.image.url}
                      alt={child.image.alt}
                      loading="lazy"
                      className="bg-surface-muted size-16 shrink-0 rounded-md object-contain p-1.5"
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-body text-ink group-hover:text-primary font-medium transition-colors">
                      {child.name}
                    </span>
                    {child.shortDescription ? (
                      <span className="text-body-sm text-ink-muted line-clamp-2">
                        {child.shortDescription}
                      </span>
                    ) : null}
                    <span className="text-caption text-ink-subtle">
                      {child.productCount} product
                      {child.productCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section spacing="normal" container="standard">
        <SectionHeader
          title="Products"
          description={`${total} product${total === 1 ? "" : "s"}${
            category.children.length > 0 ? ", including subcategories" : ""
          }`}
          align="left"
        />

        <div className="mt-8 flex flex-col gap-8">
          {products.length === 0 ? (
            <EmptyState
              title="Nothing listed yet"
              description="No products are published in this category at the moment."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          )}

          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            buildHref={(next) =>
              buildQueryHref(here, query, { page: next === 1 ? null : next })
            }
          />
        </div>
      </Section>
    </>
  );
}

/* eslint-enable @next/next/no-img-element */
