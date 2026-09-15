import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import {
  Breadcrumb,
  buttonStyles,
  Container,
  EmptyState,
  Pagination,
  Section,
  SectionHeader,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { cn } from "@/lib/utils/cn";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";
import {
  catalogueFacets,
  publicProductListing,
} from "@/server/products/public";

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Products",
  description:
    "Medical, surgical and hospital equipment supplied, installed and serviced for healthcare institutions.",
  alternates: { canonical: "/products" },
};

type RouteParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsIndex({ searchParams }: RouteParams) {
  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);

  const facets = await catalogueFacets();

  // Every filter is checked against what exists rather than passed through, so
  // a hand-edited URL cannot reach the query builder.
  const categorySlugs = new Set(
    facets.categories.flatMap((row) => [
      row.slug,
      ...row.children.map((child) => child.slug),
    ]),
  );
  const brandSlugs = new Set(facets.brands.map((row) => row.slug));
  const specialtySlugs = new Set(facets.specialties.map((row) => row.slug));

  const rawCategory = readStringParam(params.category);
  const rawBrand = readStringParam(params.brand);
  const rawSpecialty = readStringParam(params.specialty);

  const categorySlug =
    rawCategory && categorySlugs.has(rawCategory) ? rawCategory : undefined;
  const brandSlug = rawBrand && brandSlugs.has(rawBrand) ? rawBrand : undefined;
  const specialtySlug =
    rawSpecialty && specialtySlugs.has(rawSpecialty) ? rawSpecialty : undefined;

  const { total, products } = await publicProductListing({
    query,
    categorySlug,
    brandSlug,
    specialtySlug,
    page,
    pageSize: PAGE_SIZE,
  });

  const filtered = Boolean(query || categorySlug || brandSlug || specialtySlug);

  return (
    <>
      <Container className="pt-6">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Products" }]}
        />
      </Container>

      <Section spacing="normal" container="standard">
        <SectionHeader
          title="Products"
          description="Equipment we supply, install and service. Every product is quoted to your requirement."
          align="left"
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="flex flex-col gap-6">
            {/* A plain GET form: search works with JavaScript disabled, and the
                result is a shareable URL rather than hidden client state. */}
            <form action="/products" className="flex gap-2">
              <label htmlFor="catalogue-search" className="sr-only">
                Search products
              </label>
              <input
                id="catalogue-search"
                type="search"
                name="q"
                defaultValue={query ?? ""}
                placeholder="Search products"
                className="border-line-strong bg-surface text-ink text-body-sm placeholder:text-ink-subtle h-11 w-full rounded-md border px-3.5"
              />
              {categorySlug ? (
                <input type="hidden" name="category" value={categorySlug} />
              ) : null}
              {brandSlug ? (
                <input type="hidden" name="brand" value={brandSlug} />
              ) : null}
              {specialtySlug ? (
                <input type="hidden" name="specialty" value={specialtySlug} />
              ) : null}
              <button
                type="submit"
                aria-label="Search"
                className={buttonStyles({ size: "md" })}
              >
                <Search aria-hidden="true" className="size-4" />
              </button>
            </form>

            <FacetGroup
              title="Category"
              params={params}
              name="category"
              active={categorySlug}
              options={facets.categories.flatMap((row) => [
                { label: row.name, value: row.slug, depth: 0 },
                ...row.children.map((child) => ({
                  label: child.name,
                  value: child.slug,
                  depth: 1,
                })),
              ])}
            />

            <FacetGroup
              title="Brand"
              params={params}
              name="brand"
              active={brandSlug}
              options={facets.brands.map((row) => ({
                label: row.name,
                value: row.slug,
                depth: 0,
              }))}
            />

            <FacetGroup
              title="Specialty"
              params={params}
              name="specialty"
              active={specialtySlug}
              options={facets.specialties.map((row) => ({
                label: row.name,
                value: row.slug,
                depth: 0,
              }))}
            />

            {filtered ? (
              <Link
                href="/products"
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Clear all filters
              </Link>
            ) : null}
          </aside>

          <div className="flex flex-col gap-8">
            <p className="text-body-sm text-ink-muted" aria-live="polite">
              {total} product{total === 1 ? "" : "s"}
              {filtered ? " match your filters" : ""}
            </p>

            {products.length === 0 ? (
              <EmptyState
                title={filtered ? "Nothing matches" : "No products yet"}
                description={
                  filtered
                    ? "Try a broader search, or clear the filters."
                    : "The catalogue is being prepared."
                }
                action={
                  filtered ? (
                    <Link
                      href="/products"
                      className={buttonStyles({ variant: "outline" })}
                    >
                      Clear filters
                    </Link>
                  ) : null
                }
              />
            ) : (
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </ul>
            )}

            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
              buildHref={(next) =>
                buildQueryHref("/products", params, {
                  page: next === 1 ? null : next,
                })
              }
            />
          </div>
        </div>
      </Section>
    </>
  );
}

/**
 * One group of filter links.
 *
 * Links rather than checkboxes: a filtered catalogue is a page a buyer sends to
 * a colleague, and the back button should undo a filter the way they expect.
 */
function FacetGroup({
  title,
  name,
  active,
  options,
  params,
}: {
  title: string;
  name: string;
  active?: string;
  options: Array<{ label: string; value: string; depth: number }>;
  params: Record<string, string | string[] | undefined>;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-label text-ink font-medium">{title}</h2>
      <ul className="flex flex-col gap-0.5">
        {options.map((option) => {
          const selected = option.value === active;
          return (
            <li key={option.value}>
              <Link
                href={buildQueryHref("/products", params, {
                  // Selecting the active option again clears it, so a filter
                  // can be undone without hunting for a reset control.
                  [name]: selected ? null : option.value,
                  page: null,
                })}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "text-body-sm hover:text-ink block rounded-sm py-1 transition-colors",
                  option.depth > 0 && "pl-4",
                  selected ? "text-primary font-medium" : "text-ink-muted",
                )}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
