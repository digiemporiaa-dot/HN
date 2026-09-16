import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Accordion,
  Breadcrumb,
  buttonStyles,
  Container,
  EmptyState,
  Pagination,
  Section,
  SectionHeader,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { EnquiryDialog } from "@/components/site/enquiry-form";
import { RichText } from "@/cms/rich-text";
import { buildQueryHref, readPageParam } from "@/lib/utils/query";
import { visitorHasPermission } from "@/server/permissions";
import { categoryPath } from "@/server/categories/service";
import { brandPath } from "@/server/brands/service";
import { specialtyPath } from "@/server/specialties/service";
import {
  categoryApplications,
  categoryFeaturedProducts,
  publicCategory,
  publishedCategoryPaths,
  type PublicCategory,
} from "@/server/catalogue/public";
import { publicProductListing } from "@/server/products/public";
import { entityFaqs } from "@/server/faqs/service";
import { submitEnquiryAction } from "@/server/leads/actions";

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
  // A parent's own id and its children's, because everything below it belongs
  // to the page a visitor opened.
  const tree = [category.id, ...category.children.map((child) => child.id)];

  const [{ total, products }, featured, applications, faqs] = await Promise.all(
    [
      publicProductListing({
        categorySlug: category.slug,
        page,
        pageSize: PAGE_SIZE,
      }),
      categoryFeaturedProducts(tree),
      categoryApplications(tree),
      entityFaqs("Category", category.id),
    ],
  );

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

      <CategoryHero category={category} total={total} />

      {category.description ? (
        <Section spacing="normal" container="standard">
          <div className="prose-hn max-w-[70ch]">
            <RichText value={category.description} />
          </div>
        </Section>
      ) : null}

      {category.children.length > 0 ? (
        <Section spacing="normal" container="standard" background="light">
          <SectionHeader
            title="Browse by type"
            description="The ranges inside this category."
            align="left"
          />
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

      {featured.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader
            title="Featured in this range"
            description="Where a department has a usual choice, this is it."
            align="left"
          />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        spacing="normal"
        container="standard"
        background={featured.length > 0 ? "light" : "default"}
      >
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

      {category.specialties.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader
            title="Specialties served"
            description="The departments this range is supplied to."
            align="left"
          />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {category.specialties.map((specialty) => (
              <li key={specialty.id}>
                <Link
                  href={specialtyPath(specialty.slug)}
                  className="border-line bg-surface hover:border-line-strong group flex h-full gap-4 rounded-lg border p-5 transition-colors"
                >
                  {specialty.image ? (
                    <img
                      src={specialty.image.url}
                      alt={specialty.image.alt}
                      loading="lazy"
                      className="bg-surface-muted size-14 shrink-0 rounded-md object-contain p-1.5"
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-body text-ink group-hover:text-primary font-medium transition-colors">
                      {specialty.name}
                    </span>
                    {specialty.summary ? (
                      <span className="text-body-sm text-ink-muted line-clamp-2">
                        {specialty.summary}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {applications.length > 0 ? (
        <Section spacing="normal" container="standard" background="light">
          <SectionHeader
            title="Where it is used"
            description="Procedures the equipment in this range is supplied for."
            align="left"
          />
          {/* Counted from the published products rather than stored against
              the category, so a procedure stops being listed when the last
              product for it is withdrawn. */}
          <ul className="mt-8 flex flex-wrap gap-3">
            {applications.map((application) => (
              <li key={application.slug}>
                <Link
                  href={`/applications/${application.slug}`}
                  className="border-line bg-surface hover:border-line-strong text-body-sm text-ink inline-flex items-center gap-2 rounded-full border px-4 py-2 transition-colors"
                >
                  {application.name}
                  <span className="text-caption text-ink-subtle">
                    {application.productCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {category.brands.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader
            title="Brands we supply"
            description="Manufacturers whose equipment we supply, install and service in this range."
            align="left"
          />
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {category.brands.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={brandPath(brand.slug)}
                  className="border-line bg-surface hover:border-line-strong flex h-full flex-col items-center justify-center gap-3 rounded-lg border p-5 text-center transition-colors"
                >
                  {brand.logo ? (
                    <img
                      src={brand.logo.url}
                      alt={brand.logo.alt}
                      loading="lazy"
                      className="h-10 w-full object-contain"
                    />
                  ) : null}
                  <span className="text-body-sm text-ink font-medium">
                    {brand.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {category.procurementInfo ? (
        <Section spacing="normal" container="standard" background="light">
          <SectionHeader
            title="Buying this equipment"
            description="What a purchase team needs before raising a tender."
            align="left"
          />
          <div className="prose-hn mt-6 max-w-[70ch]">
            <RichText value={category.procurementInfo} />
          </div>
        </Section>
      ) : null}

      {faqs.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader title="Questions" align="left" />
          <div className="mt-6 max-w-[70ch]">
            <Accordion
              items={faqs.map((faq) => ({
                id: faq.id,
                question: faq.question,
                answer: <RichText value={faq.answer} />,
              }))}
            />
          </div>
        </Section>
      ) : null}

      <Section spacing="large" container="standard" background="dark">
        <div className="flex flex-col items-start gap-6">
          <SectionHeader
            title={`Ask us about ${category.name}`}
            description="Tell us the department, the configuration and the timeline. Everything in this range is quoted to requirement, and we reply within one working day."
            align="left"
          />
          <EnquiryDialog
            action={submitEnquiryAction}
            triggerLabel="Request a quotation"
            triggerClassName={buttonStyles({ size: "lg" })}
            title={`Request a quotation — ${category.name}`}
            description="We reply within one working day."
            submitLabel="Send enquiry"
          />
        </div>
      </Section>
    </>
  );
}

/**
 * The top of a category page.
 *
 * A banner, where one has been uploaded, is the background rather than a strip
 * above the page: a picture of an operating theatre sitting in its own band
 * with the heading underneath reads as decoration, and the same picture behind
 * the heading reads as the page. Without one the hero is typographic, which is
 * the honest alternative to stretching a placeholder across the screen.
 */
function CategoryHero({
  category,
  total,
}: {
  category: PublicCategory;
  total: number;
}) {
  const trail = [
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
  ];

  const heading = (
    <div className="flex max-w-[60ch] flex-col gap-4">
      <p className="text-overline text-primary uppercase">
        {category.parent ? category.parent.name : "Catalogue"}
      </p>
      <h1 className="text-h1 text-ink">{category.name}</h1>
      {category.shortDescription ? (
        <p className="text-body-lg text-ink-muted">
          {category.shortDescription}
        </p>
      ) : null}
      <p className="text-body-sm text-ink-subtle">
        {total} product{total === 1 ? "" : "s"}
        {category.children.length > 0
          ? ` across ${category.children.length} ${
              category.children.length === 1 ? "type" : "types"
            }`
          : ""}
      </p>
    </div>
  );

  if (!category.banner) {
    return (
      <>
        <Container className="pt-6">
          <Breadcrumb items={trail} />
        </Container>
        <Section spacing="normal" container="standard">
          {heading}
        </Section>
      </>
    );
  }

  return (
    <div className="relative isolate">
      <img
        src={category.banner.url}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      {/* Dark enough for the heading to hold at any photograph. The gradient
          rather than a flat wash so the picture still reads as a picture. */}
      <div
        aria-hidden="true"
        className="from-navy-950/95 via-navy-950/80 to-navy-950/55 absolute inset-0 -z-10 bg-gradient-to-r"
      />

      {/* The same dark theme every other dark section uses, with its own
          background turned off so the photograph shows through. Reusing the
          class rather than hand-picking colours is what keeps a heading over a
          picture the same white as a heading over navy. */}
      {/* The accent is lightened for this one block rather than in
          `.surface-dark` itself: the shared class also colours filled buttons,
          and a pale blue button with white text on it would be worse than the
          overline it fixes. There are no filled buttons in a hero. */}
      <div className="surface-dark bg-transparent [--color-primary:var(--color-medical-300)]">
        <Container className="pt-6">
          <Breadcrumb items={trail} />
        </Container>
        {/* The section's own background has to go too, not just the wrapper's:
            every Section paints one, and a white one here would cover the
            photograph and leave a white heading on white. */}
        <Section
          spacing="large"
          container="standard"
          className="bg-transparent"
        >
          {heading}
        </Section>
      </div>
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */
