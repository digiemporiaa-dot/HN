import type { Metadata } from "next";
import Link from "next/link";

import {
  Accordion,
  buttonStyles,
  Container,
  EmptyState,
  Pagination,
  Section,
  SectionHeader,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { MetaChip, PageHero } from "@/components/site/page-hero";
import { PageCta } from "@/components/site/page-cta";
import {
  ArrowLink,
  BrandCard,
  CategoryCard,
  fitColumns,
  SceneCard,
} from "@/components/site/cards";
import { SectionNav } from "@/components/site/section-nav";
import { categoryVisual, sceneVisual } from "@/lib/visuals";
import { SmartImage } from "@/components/site/media";
import { EnquiryDialog } from "@/components/site/enquiry-form";
import { RichText } from "@/cms/rich-text";
import { buildQueryHref, readPageParam } from "@/lib/utils/query";
import { categoryPath } from "@/server/categories/service";
import { brandPath } from "@/server/brands/service";
import { specialtyPath } from "@/server/specialties/service";
import {
  categoryApplications,
  categoryFeaturedProducts,
  publicCategory,
} from "@/server/catalogue/public";
import { publicProductListing } from "@/server/products/public";
import { entityFaqs } from "@/server/faqs/service";
import { submitEnquiryAction } from "@/server/leads/actions";
import { withSeoOverride } from "@/server/seo/overrides";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageJsonLd, itemListJsonLd } from "@/server/seo/structured-data";
import { listingMetadata } from "@/server/seo/listing";
import { missingPage } from "@/server/seo/missing";
import { canPreview } from "@/server/preview";

const PAGE_SIZE = 16;

type RouteParams = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Rendered per request: the product list is paginated with ?page=, and a
 * prerendered route cannot read the query string. Left static, an address
 * that was not built at deploy time — a brand published since, or one that
 * does not exist — failed with a server error instead of rendering.
 */
export const dynamic = "force-dynamic";

async function pageMetadata({ params }: RouteParams): Promise<Metadata> {
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

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(route: RouteParams): Promise<Metadata> {
  const { path } = await route.params;
  const here = `/categories/${path.join("/")}`;
  const base = listingMetadata(
    await pageMetadata(route),
    here,
    await route.searchParams,
  );
  return withSeoOverride(here, base);
}

export default async function CategoryPage({
  params,
  searchParams,
}: RouteParams) {
  const { path } = await params;
  const query = await searchParams;
  const page = readPageParam(query.page);

  const category = await publicCategory(path);
  if (!category) return missingPage(`/categories/${path.join("/")}`);

  const published = category.status === "PUBLISHED";
  if (!published && !(await canPreview("CATEGORIES"))) {
    return missingPage(`/categories/${path.join("/")}`);
  }

  // A parent lists everything under it, including what sits in its
  // subcategories — that is what a visitor opening it expects to find.
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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const trail = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    ...(category.parent
      ? [{ label: category.parent.name, href: categoryPath(category.parent.slug) }]
      : []),
    { label: category.name },
  ];

  const nav = [
    category.children.length > 0 ? { id: "ranges", label: "Ranges" } : null,
    { id: "products", label: "Products" },
    category.description ? { id: "about", label: "About" } : null,
    category.specialties.length > 0 ? { id: "specialties", label: "Specialties" } : null,
    category.procurementInfo ? { id: "procurement", label: "Procurement" } : null,
    faqs.length > 0 ? { id: "faq", label: "FAQ" } : null,
  ].filter((row): row is { id: string; label: string } => row !== null);

  const enquiry = (label = "Request a quotation") => (
    // The category travels with the enquiry, so a lead records which range it
    // came from rather than arriving as an unattributed contact-form message.
    <EnquiryDialog
      action={submitEnquiryAction}
      categoryId={category.id}
      triggerLabel={label}
      triggerClassName={buttonStyles({ size: "lg" })}
      title={`Request a quotation — ${category.name}`}
      description="Tell us the department, quantities and timeline. We reply within one working day."
      submitLabel="Send enquiry"
    />
  );

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

      <PageHero
        variant={category.banner ? "image" : "pearl"}
        trail={trail}
        eyebrow={category.parent ? category.parent.name : "Equipment category"}
        title={category.name}
        description={category.shortDescription}
        image={category.banner ?? category.image ?? categoryVisual(category.name)}
        meta={
          <>
            <MetaChip>
              {total} product{total === 1 ? "" : "s"}
            </MetaChip>
            {category.children.length > 0 ? (
              <MetaChip>
                {category.children.length} {category.children.length === 1 ? "range" : "ranges"}
              </MetaChip>
            ) : null}
            <MetaChip>Quoted to requirement</MetaChip>
          </>
        }
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            {enquiry()}
            <Link href="#products" className={buttonStyles({ variant: "soft", size: "lg" })}>
              View products
            </Link>
          </div>
        }
      />

      {/* Described to search engines only once public, like the product page. */}
      {published ? (
        <>
          <JsonLd
            data={itemListJsonLd(
              category.name,
              products.map((product) => ({
                name: product.name,
                path: `/products/${product.slug}`,
              })),
              (page - 1) * PAGE_SIZE,
            )}
          />
          <JsonLd data={faqPageJsonLd(faqs)} />
        </>
      ) : null}

      <SectionNav items={nav} label="Category sections" />

      {category.children.length > 0 ? (
        <Section spacing="large" container="wide" anchorId="ranges">
          <SectionHeader overline="Ranges" title={`Inside ${category.name}.`} description="The equipment types within this category." />
          <ul className={`reveal-stagger mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6 ${fitColumns(category.children.length).replace("sm:grid-cols-2 ", "")}`}>
            {category.children.map((child) => (
              <li key={child.id}>
                <CategoryCard
                  size="compact"
                  data={{
                    name: child.name,
                    href: categoryPath(child.slug, category.slug),
                    summary: child.shortDescription,
                    image: child.image,
                    count: child.productCount,
                  }}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {featured.length > 0 && page === 1 && total > 6 ? (
        <Section spacing="large" container="wide" background="pearl">
          <SectionHeader overline="Featured" title="Frequently specified." description="Where a department has a usual choice, this is it." />
          <ul className="reveal-stagger mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section spacing="large" container="wide" anchorId="products">
        <SectionHeader
          overline="Products"
          title={`All ${category.name.toLowerCase()} equipment.`}
          description={`${total} product${total === 1 ? "" : "s"}${category.children.length > 0 ? ", including every range in this category" : ""}.`}
          action={<ArrowLink href={`/products?category=${category.slug}`}>Filter in the catalogue</ArrowLink>}
        />
        <div className="mt-12 flex flex-col gap-10">
          {products.length === 0 ? (
            <EmptyState
              title="Products are being added"
              description="This range is being prepared for the catalogue. Our team can already quote for it."
              action={enquiry("Ask about this range")}
            />
          ) : (
            <ul className={`reveal-stagger grid grid-cols-1 gap-5 lg:gap-6 ${fitColumns(products.length)}`}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          )}
          {totalPages > 1 ? (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              buildHref={(next) =>
                buildQueryHref(here, query, { page: next === 1 ? null : next })
              }
            />
          ) : null}
        </div>
      </Section>

      {category.description ? (
        <Section spacing="large" container="wide" background="pearl" anchorId="about">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <span className="eyebrow">About this category</span>
              <h2 className="text-section text-ink">{category.name} for healthcare institutions.</h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <RichText value={category.description} className="prose-hn max-w-[68ch]" />
              {applications.length > 0 ? (
                <div className="mt-10 flex flex-col gap-4">
                  <p className="eyebrow">Used in</p>
                  {/* Counted from the published products rather than stored
                      against the category, so a procedure stops being listed
                      when the last product for it is withdrawn. */}
                  <ul className="border-line border-t">
                    {applications.map((application) => (
                      <li key={application.slug} className="border-line border-b">
                        <Link href={`/applications/${application.slug}`} className="group text-ink hover:text-primary flex items-center justify-between gap-4 py-3 transition-colors">
                          {application.name}
                          <span className="text-ink-subtle text-[0.75rem] tabular-nums">
                            {application.productCount} product{application.productCount === 1 ? "" : "s"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      {/* The range in its setting: one wide clinical photograph between the
          reading and the browsing. */}
      <Section spacing="compact" container="wide">
        <figure className="flex flex-col gap-3">
          <div className="media-frame reveal-image aspect-[4/3] rounded-xl sm:aspect-[16/7] lg:aspect-[21/8]">
            <SmartImage src={sceneVisual(category.name).url} alt={sceneVisual(category.name).alt} sizes="(min-width: 1440px) 1360px, 100vw" />
          </div>
          <figcaption className="text-ink-subtle text-[0.75rem]">{category.name} in a clinical setting.</figcaption>
        </figure>
      </Section>

      {category.specialties.length > 0 ? (
        <Section spacing="large" container="wide" anchorId="specialties">
          <SectionHeader overline="Specialties" title="Departments this range serves." action={<ArrowLink href="/specialties">All specialties</ArrowLink>} />
          <ul className={`reveal-stagger mt-12 grid grid-cols-1 gap-5 lg:gap-6 ${fitColumns(category.specialties.length)}`}>
            {category.specialties.map((specialty) => (
              <li key={specialty.id}>
                <SceneCard
                  kind="specialty"
                  data={{ name: specialty.name, href: specialtyPath(specialty.slug), summary: specialty.summary, image: specialty.image }}
                  aspect="landscape"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {category.brands.length > 0 ? (
        <Section spacing="normal" container="wide" background="pearl">
          <SectionHeader overline="Brands" title="Manufacturers in this range." size="compact" />
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {category.brands.map((brand) => (
              <li key={brand.slug}>
                <BrandCard data={{ name: brand.name, href: brandPath(brand.slug), image: brand.logo }} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {category.procurementInfo ? (
        <Section spacing="large" container="wide" anchorId="procurement">
          <div className="border-ink/80 grid gap-8 border-t pt-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-4 lg:col-span-4">
              <span className="eyebrow">Procurement</span>
              <h2 className="text-section text-ink">Buying this equipment.</h2>
              <p className="text-body-sm text-ink-muted">What a purchase team needs before raising a tender.</p>
            </div>
            <div className="lg:col-span-8">
              <RichText value={category.procurementInfo} className="prose-hn" />
            </div>
          </div>
        </Section>
      ) : null}

      {faqs.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl" anchorId="faq">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <span className="eyebrow">FAQ</span>
              <h2 className="text-h1 text-ink">Questions about {category.name.toLowerCase()}.</h2>
            </div>
            <div className="lg:col-span-8">
              <Accordion
                items={faqs.map((faq) => ({
                  id: faq.id,
                  question: faq.question,
                  answer: <RichText value={faq.answer} />,
                }))}
              />
            </div>
          </div>
        </Section>
      ) : null}

      <PageCta
        title={`Equipping a department with ${category.name.toLowerCase()}?`}
        body="Tell us the department, quantities and timeline. Everything in this range is quoted to requirement, and we reply within one working day."
        actions={
          <>
            {enquiry()}
            <Link href="/rfq" className={buttonStyles({ variant: "outline-inverse", size: "lg" })}>
              Build a quotation list
            </Link>
          </>
        }
      />
    </>
  );
}
