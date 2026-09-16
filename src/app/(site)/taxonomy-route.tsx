import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TaxonomyLanding } from "@/components/site/taxonomy-landing";
import { visitorHasPermission } from "@/server/permissions";
import { publicProductListing } from "@/server/products/public";
import type { PermissionModule } from "@/generated/prisma/enums";
import type { TaxonomyRecord } from "@/server/catalogue/public";

export const LANDING_PAGE_SIZE = 16;

type Filter =
  | "brandSlug"
  | "specialtySlug"
  | "solutionSlug"
  | "applicationSlug";

export type TaxonomyRouteConfig = {
  /** "brand" — used in copy, so lower case and singular. */
  noun: string;
  /** "/brands" — the index this record sits under. */
  basePath: string;
  indexLabel: string;
  filter: Filter;
  /** Draft records are previewable by staff who may view this module. */
  module: PermissionModule;
  /** Where an editor goes to fix it, for the preview banner. */
  adminPath: (id: string) => string;
  load: (slug: string) => Promise<TaxonomyRecord | null>;
};

/**
 * One implementation for the four landing pages that share a shape.
 *
 * Each route file supplies its nouns and its loader; nothing else differs
 * between a brand page and a specialty page, and four copies of this would
 * drift the moment one of them gained a feature.
 */
export async function taxonomyMetadata(
  config: TaxonomyRouteConfig,
  slug: string,
): Promise<Metadata> {
  const record = await config.load(slug);
  if (!record) return { title: "Not found" };

  const description =
    record.shortDescription ?? `Equipment we supply for ${record.name}.`;

  return {
    title: record.name,
    description,
    alternates: { canonical: `${config.basePath}/${record.slug}` },
    openGraph: {
      title: record.name,
      description,
      type: "website",
      images: record.banner
        ? [{ url: record.banner.url }]
        : record.image
          ? [{ url: record.image.url }]
          : undefined,
    },
    // Spread rather than set to undefined, so a published page inherits the
    // site-wide robots setting instead of replacing it.
    ...(record.status === "PUBLISHED"
      ? {}
      : { robots: { index: false, follow: false } }),
  };
}

export async function TaxonomyRoute({
  config,
  slug,
  page,
  searchParams,
}: {
  config: TaxonomyRouteConfig;
  slug: string;
  page: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const record = await config.load(slug);
  if (!record) notFound();

  const published = record.status === "PUBLISHED";
  // The same response as a slug that does not exist, so an unpublished URL
  // cannot be probed for.
  if (!published && !(await visitorHasPermission(config.module, "VIEW"))) {
    notFound();
  }

  const { total, products } = await publicProductListing({
    [config.filter]: record.slug,
    page,
    pageSize: LANDING_PAGE_SIZE,
  } as Parameters<typeof publicProductListing>[0]);

  return (
    <TaxonomyLanding
      record={record}
      trail={[
        { label: "Home", href: "/" },
        { label: config.indexLabel, href: config.basePath },
        { label: record.name },
      ]}
      products={products}
      total={total}
      page={page}
      pageSize={LANDING_PAGE_SIZE}
      basePath={`${config.basePath}/${record.slug}`}
      searchParams={searchParams}
      emptyMessage={`No products are listed under this ${config.noun} yet.`}
      preview={
        published
          ? null
          : { href: config.adminPath(record.id), label: config.noun }
      }
    />
  );
}
