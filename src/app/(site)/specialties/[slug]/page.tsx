import type { Metadata } from "next";

import { readPageParam } from "@/lib/utils/query";
import { publicSpecialty } from "@/server/catalogue/public";
import {
  taxonomyMetadata,
  TaxonomyRoute,
  type TaxonomyRouteConfig,
} from "../../taxonomy-route";

const CONFIG: TaxonomyRouteConfig = {
  noun: "specialty",
  basePath: "/specialties",
  indexLabel: "Specialties",
  filter: "specialtySlug",
  module: "SPECIALTIES",
  adminPath: (id) => `/admin/specialties/${id}`,
  load: publicSpecialty,
};

type RouteParams = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Rendered per request: the product list is paginated with ?page=, and a
 * prerendered route cannot read the query string. Left static, an address
 * that was not built at deploy time — a brand published since, or one that
 * does not exist — failed with a server error instead of rendering.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  return taxonomyMetadata(CONFIG, slug, await searchParams);
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
