import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";

import {
  buttonStyles,
  Container,
  EmptyState,
  Pagination,
  Section,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { MetaChip, PageHero } from "@/components/site/page-hero";
import { PageCta } from "@/components/site/page-cta";
import { FilterSheet } from "@/components/site/filter-sheet";
import { SmartImage } from "@/components/site/media";
import { CATEGORY_VISUALS } from "@/lib/visuals";
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
import { withSeoOverride } from "@/server/seo/overrides";
import { JsonLd } from "@/components/seo/json-ld";
import { itemListJsonLd } from "@/server/seo/structured-data";
import { listingMetadata } from "@/server/seo/listing";

const PAGE_SIZE = 12;

const BASE_METADATA: Metadata = {
  title: "Products",
  description:
    "Medical, surgical and hospital equipment supplied, installed and serviced for healthcare institutions.",
  alternates: { canonical: "/products" },
};

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata({
  searchParams,
}: RouteParams): Promise<Metadata> {
  return withSeoOverride(
    "/products",
    listingMetadata(BASE_METADATA, "/products", await searchParams, [
      "q",
      "category",
      "brand",
      "specialty",
    ]),
  );
}

type RouteParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Option = { label: string; value: string; depth: number; count?: number };

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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoryOptions: Option[] = facets.categories.flatMap((row) => [
    { label: row.name, value: row.slug, depth: 0, count: row._count.products || undefined },
    ...row.children.map((child) => ({ label: child.name, value: child.slug, depth: 1 })),
  ]);
  const brandOptions: Option[] = facets.brands.map((row) => ({ label: row.name, value: row.slug, depth: 0 }));
  const specialtyOptions: Option[] = facets.specialties.map((row) => ({ label: row.name, value: row.slug, depth: 0 }));

  const labelOf = (options: Option[], value?: string) =>
    options.find((option) => option.value === value)?.label ?? value;

  const active = [
    query ? { key: "q", label: `“${query}”` } : null,
    categorySlug ? { key: "category", label: labelOf(categoryOptions, categorySlug) } : null,
    brandSlug ? { key: "brand", label: labelOf(brandOptions, brandSlug) } : null,
    specialtySlug ? { key: "specialty", label: labelOf(specialtyOptions, specialtySlug) } : null,
  ].filter((row): row is { key: string; label: string } => row !== null);

  const filters = (
    <div className="flex flex-col gap-4">
      <FacetGroup title="Category" params={params} name="category" active={categorySlug} options={categoryOptions} />
      <FacetGroup title="Specialty" params={params} name="specialty" active={specialtySlug} options={specialtyOptions} />
      <FacetGroup title="Brand" params={params} name="brand" active={brandSlug} options={brandOptions} />
      {filtered ? (
        <Link href="/products" className={buttonStyles({ variant: "outline", size: "md" })}>
          Clear all filters
        </Link>
      ) : null}
    </div>
  );

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Products" }]}
        eyebrow="Equipment catalogue"
        title="Medical equipment for every department."
        description="Explore monitoring, critical care, operation theatre, diagnostic, neonatal and emergency equipment — every product quoted to your requirement."
        aside={<HeroMosaic />}
        meta={
          <>
            <MetaChip>
              <span className="size-1.5 rounded-full bg-cyan-500" />
              {total} product{total === 1 ? "" : "s"}
              {filtered ? " found" : ""}
            </MetaChip>
            <MetaChip>{facets.categories.length} categories</MetaChip>
            <MetaChip>Quoted to requirement</MetaChip>
          </>
        }
      >
        {/* A plain GET form: search works with JavaScript disabled, and the
            result is a shareable URL rather than hidden client state. */}
        <form action="/products" role="search" className="intro mt-2 flex w-full max-w-[40rem] gap-2 [--i:3]">
          <label htmlFor="catalogue-search" className="sr-only">
            Search products
          </label>
          <div className="relative flex-1">
            <Search aria-hidden="true" className="text-ink-subtle pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
            <input
              id="catalogue-search"
              type="search"
              name="q"
              defaultValue={query ?? ""}
              placeholder="Search equipment or model"
              className="border-line-strong bg-surface text-ink text-body placeholder:text-ink-subtle focus:border-primary h-14 w-full rounded-xl border pr-4 pl-12 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] focus:shadow-[0_0_0_4px_rgb(31_102_220/0.12)] focus-visible:outline-none"
            />
          </div>
          {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
          {brandSlug ? <input type="hidden" name="brand" value={brandSlug} /> : null}
          {specialtySlug ? <input type="hidden" name="specialty" value={specialtySlug} /> : null}
          <button type="submit" className={cn(buttonStyles({ size: "lg" }), "h-14 px-6")}>
            Search
          </button>
        </form>
      </PageHero>

      <JsonLd
        data={itemListJsonLd(
          "Products",
          products.map((product) => ({
            name: product.name,
            path: `/products/${product.slug}`,
          })),
          (page - 1) * PAGE_SIZE,
        )}
      />

      {/* Category shortcuts: the fastest way into the catalogue. */}
      <div className="border-line bg-surface sticky top-[var(--header-h)] z-30 border-b">
        <Container width="wide">
          <nav aria-label="Categories" className="scrollbar-none -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] py-3">
            <CategoryPill href={buildQueryHref("/products", params, { category: null, page: null })} active={!categorySlug}>
              All equipment
            </CategoryPill>
            {facets.categories.map((row) => (
              <CategoryPill
                key={row.slug}
                href={buildQueryHref("/products", params, { category: row.slug, page: null })}
                active={categorySlug === row.slug || row.children.some((child) => child.slug === categorySlug)}
              >
                {row.name}
              </CategoryPill>
            ))}
          </nav>
        </Container>
      </div>

      <Section spacing="normal" container="wide" background="pearl">
        <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
          <aside aria-label="Filters" className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-h)+5rem)] flex max-h-[calc(100dvh-var(--header-h)-6rem)] flex-col gap-4 overflow-y-auto pr-1">
              {filters}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-sm text-ink-muted" aria-live="polite">
                Showing <span className="text-ink font-semibold">{products.length}</span> of{" "}
                <span className="text-ink font-semibold">{total}</span> product{total === 1 ? "" : "s"}
                {filtered ? " matching your filters" : ""}
              </p>
              <FilterSheet activeCount={active.length}>{filters}</FilterSheet>
            </div>

            {active.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Active filters">
                {active.map((filter) => (
                  <li key={filter.key}>
                    <Link
                      href={buildQueryHref("/products", params, { [filter.key]: null, page: null })}
                      className="bg-primary-subtle text-primary border-medical-200 hover:border-primary text-body-sm inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 font-medium transition-colors"
                    >
                      {filter.label}
                      <X aria-hidden="true" className="size-3.5" />
                      <span className="sr-only">Remove filter</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {products.length === 0 ? (
              <EmptyState
                icon={<Search aria-hidden="true" className="size-6" />}
                title={filtered ? "No products match these filters" : "The catalogue is being prepared"}
                description={
                  filtered
                    ? "Try a broader search or remove a filter. Our team can also source equipment that is not listed."
                    : "Products will appear here as they are published. In the meantime, our team can help with any requirement."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    {filtered ? (
                      <Link href="/products" className={buttonStyles({ variant: "outline" })}>
                        Clear filters
                      </Link>
                    ) : null}
                    <Link href="/contact" className={buttonStyles({})}>
                      Ask our team
                    </Link>
                  </div>
                }
              />
            ) : (
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 2} sizes="(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 92vw" />
                ))}
              </ul>
            )}

            {totalPages > 1 ? (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                className="pt-4"
                buildHref={(next) =>
                  buildQueryHref("/products", params, {
                    page: next === 1 ? null : next,
                  })
                }
              />
            ) : null}
          </div>
        </div>
      </Section>

      <PageCta
        title="Can't find the exact configuration?"
        body="Our team sources and configures equipment beyond what is listed. Send us your requirement and we will prepare a quotation."
        actions={
          <>
            <Link href="/rfq" className={buttonStyles({ size: "lg" })}>
              Request a quote
            </Link>
            <Link href="/contact" className={buttonStyles({ variant: "outline-inverse", size: "lg" })}>
              Talk to our team
            </Link>
          </>
        }
      />
    </>
  );
}

/** Three equipment renders, arranged as the hero's visual. */
function HeroMosaic() {
  const tiles = [
    CATEGORY_VISUALS.patientMonitoring,
    CATEGORY_VISUALS.criticalCare,
    CATEGORY_VISUALS.diagnostic,
  ];
  return (
    <div className="hidden grid-cols-2 gap-4 lg:grid">
      <div className="media-frame border-line row-span-2 aspect-[3/4] rounded-3xl border shadow-[var(--shadow-float)]">
        <SmartImage src={tiles[0].url} alt={tiles[0].alt} sizes="20vw" priority className="object-[40%_center]" />
      </div>
      {tiles.slice(1).map((tile) => (
        <div key={tile.url} className="media-frame border-line aspect-[4/3] rounded-3xl border shadow-[var(--shadow-card)]">
          <SmartImage src={tile.url} alt={tile.alt} sizes="20vw" />
        </div>
      ))}
    </div>
  );
}

function CategoryPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "text-body-sm inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-navy-950 border-navy-950 text-white"
          : "border-line text-ink-muted hover:border-line-strong hover:text-ink bg-surface",
      )}
    >
      {children}
    </Link>
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
  options: Option[];
  params: Record<string, string | string[] | undefined>;
}) {
  if (options.length === 0) return null;

  return (
    <details open className="group/facet border-line bg-surface rounded-2xl border">
      <summary className="text-ink flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[0.8125rem] font-semibold tracking-[0.12em] uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-ink-subtle transition-transform group-open/facet:rotate-45">
          +
        </span>
      </summary>
      <ul className="flex flex-col gap-0.5 px-3 pb-4">
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
                  "text-body-sm flex min-h-10 items-center justify-between gap-3 rounded-lg px-2.5 transition-colors",
                  option.depth > 0 && "ml-3 text-[0.875rem]",
                  selected
                    ? "bg-primary-subtle text-primary font-semibold"
                    : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
                )}
              >
                <span className="min-w-0">{option.label}</span>
                {selected ? (
                  <X aria-hidden="true" className="size-3.5 shrink-0" />
                ) : option.count ? (
                  <span className="text-caption text-ink-subtle tabular-nums">{option.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
