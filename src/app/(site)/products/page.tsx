import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";

import {
  buttonStyles,
  Container,
  EmptyState,
  Pagination,
  Section,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { PageHero } from "@/components/site/page-hero";
import { PageCta } from "@/components/site/page-cta";
import { FilterSheet } from "@/components/site/filter-sheet";
import { SmartImage } from "@/components/site/media";

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
        title={
          <>
            Medical technology for every <strong className="font-semibold">clinical environment.</strong>
          </>
        }
        description="Monitoring, critical care, imaging, operation theatre, neonatal and emergency equipment — every product quoted to your requirement."
        aside={<HeroMosaic />}
        size="lg"
      >
        {/* A plain GET form: search works with JavaScript disabled, and the
            result is a shareable URL rather than hidden client state. */}
        <form action="/products" role="search" className="intro border-ink/80 mt-4 flex w-full max-w-[36rem] items-center gap-3 border-b pb-2 [--i:3] focus-within:border-primary">
          <label htmlFor="catalogue-search" className="sr-only">
            Search products
          </label>
          <Search aria-hidden="true" className="text-ink-subtle size-5 shrink-0" />
          <input
            id="catalogue-search"
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search equipment, category or model"
            size={1}
            className="text-ink placeholder:text-ink-subtle h-12 w-full min-w-0 flex-1 bg-transparent text-[1.0625rem] focus-visible:outline-none"
          />
          {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
          {brandSlug ? <input type="hidden" name="brand" value={brandSlug} /> : null}
          {specialtySlug ? <input type="hidden" name="specialty" value={specialtySlug} /> : null}
          <button type="submit" className={cn(buttonStyles({ size: "sm" }), "group shrink-0")}>
            Search
            <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
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
          <nav aria-label="Categories" className="scrollbar-none -mx-[var(--gutter)] flex gap-7 overflow-x-auto px-[var(--gutter)]">
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
                      className="bg-surface text-ink hover:text-primary inline-flex min-h-8 items-center gap-2 rounded-md px-3 text-[0.8125rem] font-medium transition-colors"
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
              <ul className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:gap-x-6 xl:grid-cols-3">
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

/** A group shot on the stage surface: equipment arranged like a campaign. */
function HeroMosaic() {
  return (
    <div className="stage-surface relative hidden aspect-[5/4] overflow-hidden rounded-[1.75rem] lg:block">
      <span aria-hidden="true" className="absolute bottom-[7%] left-[12%] h-[8%] w-[76%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(11_13_15/0.14),transparent)] blur-md" />
      <div className="absolute top-[10%] right-[6%] bottom-[8%] w-[36%]">
        <SmartImage src={`${HOUSE}/products/icu-ventilator.webp`} alt="ICU ventilator" sizes="16vw" fit="contain" priority />
      </div>
      <div className="absolute top-[22%] bottom-[8%] left-[30%] w-[30%]">
        <SmartImage src={`${HOUSE}/products/ultrasound.webp`} alt="Ultrasound system" sizes="14vw" fit="contain" />
      </div>
      <div className="absolute bottom-[9%] left-[6%] h-[42%] w-[38%]">
        <SmartImage src={`${HOUSE}/products/patient-monitor.webp`} alt="Patient monitor" sizes="16vw" fit="contain" />
      </div>
    </div>
  );
}

const HOUSE = "/images/hn";

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
        "relative inline-flex h-12 shrink-0 items-center text-[0.875rem] whitespace-nowrap transition-colors",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:transition-transform after:duration-[var(--duration-base)]",
        active
          ? "text-ink font-medium after:scale-x-100 after:bg-ink"
          : "text-ink-muted hover:text-ink after:scale-x-0 after:bg-ink",
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
    <details open className="group/facet border-line border-t">
      <summary className="text-ink flex cursor-pointer list-none items-center justify-between py-4 text-[0.75rem] font-semibold tracking-[0.1em] uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-ink-subtle transition-transform group-open/facet:rotate-45">
          +
        </span>
      </summary>
      <ul className="-mx-2.5 flex flex-col pb-4">
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
                  "text-body-sm flex min-h-9 items-center justify-between gap-3 rounded-md px-2.5 transition-colors",
                  option.depth > 0 && "ml-3 text-[0.875rem]",
                  selected
                    ? "text-ink font-semibold"
                    : "text-ink-muted hover:text-ink",
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
