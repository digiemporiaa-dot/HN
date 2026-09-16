import type { Metadata } from "next";

import { readPageParam } from "@/lib/utils/query";
import { publicBrand, publishedBrandSlugs } from "@/server/catalogue/public";
import {
  taxonomyMetadata,
  TaxonomyRoute,
  type TaxonomyRouteConfig,
} from "../../taxonomy-route";

const CONFIG: TaxonomyRouteConfig = {
  noun: "brand",
  basePath: "/brands",
  indexLabel: "Brands",
  filter: "brandSlug",
  module: "BRANDS",
  adminPath: (id) => `/admin/brands/${id}`,
  load: publicBrand,
};

type RouteParams = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  const slugs = await publishedBrandSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  return taxonomyMetadata(CONFIG, slug);
}

export default async function Page({ params, searchParams }: RouteParams) {
  const { slug } = await params;
  const query = await searchParams;

  return (
    <TaxonomyRoute
      config={CONFIG}
      slug={slug}
      page={readPageParam(query.page)}
      searchParams={query}
    />
  );
}
