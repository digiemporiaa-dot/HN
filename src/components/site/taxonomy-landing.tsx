import Link from "next/link";
import { ExternalLink } from "lucide-react";

import {
  buttonStyles,
  Container,
  EmptyState,
  Pagination,
  Section,
  SectionHeader,
  type BreadcrumbItem,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { RichText } from "@/cms/rich-text";
import { categoryPath } from "@/server/categories/service";
import { buildQueryHref } from "@/lib/utils/query";
import { sceneVisual, type VisualKind } from "@/lib/visuals";
import type { ProductCardData, PublicImage } from "@/server/products/public";
import type { TaxonomyRecord } from "@/server/catalogue/public";
import {
  ArrowLink,
  BrandCard,
  CategoryCard,
  fitColumns,
  SceneCard,
} from "./cards";
import { MetaChip, PageHero } from "./page-hero";
import { PageCta } from "./page-cta";
import { SmartImage } from "./media";

/* Words that change between the four landing types. */
const COPY: Record<string, { eyebrow: string; overview: string; products: string }> = {
  specialty: {
    eyebrow: "Clinical specialty",
    overview: "Equipment for the department",
    products: "Equipment for this specialty",
  },
  solution: {
    eyebrow: "Healthcare solution",
    overview: "What the solution covers",
    products: "Equipment in this solution",
  },
  application: {
    eyebrow: "Clinical environment",
    overview: "About this environment",
    products: "Equipment used here",
  },
  brand: {
    eyebrow: "Manufacturer",
    overview: "About the manufacturer",
    products: "Products from this brand",
  },
};

/**
 * The page a brand, specialty, solution or application gets.
 *
 * The three that have a publishing lifecycle carry identical fields, and an
 * application is the same page with fewer of them filled in, so all four share
 * this rather than four files differing only in nouns. A category does not:
 * it nests, it owns its products outright, and its URL has two levels.
 *
 * Clinical records open on their environment photograph; a brand opens on its
 * mark, because a manufacturer's logo stretched behind a headline is no one's
 * idea of a hero.
 */
export function TaxonomyLanding({
  kind,
  record,
  trail,
  products,
  total,
  page,
  pageSize,
  basePath,
  searchParams,
  emptyMessage,
  preview,
}: {
  kind: string;
  record: TaxonomyRecord;
  trail: BreadcrumbItem[];
  products: ProductCardData[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  emptyMessage: string;
  preview?: { href: string; label: string } | null;
}) {
  const copy = COPY[kind] ?? COPY.specialty;
  const brand = kind === "brand";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const heroImage = brand ? null : (record.banner ?? record.image ?? sceneVisual(record.name));

  const enquire = (
    <Link href="/rfq" className={buttonStyles({ size: "lg" })}>
      Request a quote
    </Link>
  );

  return (
    <>
      {preview ? (
        <div className="bg-warning-50 border-warning-100 border-b">
          <Container className="text-body-sm text-warning-700 flex flex-wrap items-center justify-between gap-3 py-3">
            <span>
              Preview — this {preview.label} is {record.status.toLowerCase()}{" "}
              and is not visible to the public.
            </span>
            <Link href={preview.href} className="underline underline-offset-4">
              Edit
            </Link>
          </Container>
        </div>
      ) : null}

      <PageHero
        variant={heroImage ? "image" : "pearl"}
        trail={trail}
        eyebrow={copy.eyebrow}
        title={record.name}
        description={record.shortDescription}
        image={heroImage}
        aside={
          brand && record.image ? (
            <div className="border-line bg-surface flex aspect-[16/9] items-center justify-center rounded-3xl border p-10 shadow-[var(--shadow-float)]">
              <div className="relative h-24 w-full">
                <SmartImage src={record.image.url} alt={record.image.alt} sizes="400px" fit="contain" priority />
              </div>
            </div>
          ) : undefined
        }
        meta={
          <>
            <MetaChip dark={Boolean(heroImage)}>
              <span className="size-1.5 rounded-full bg-cyan-500" />
              {total} product{total === 1 ? "" : "s"}
            </MetaChip>
            {record.categories.length > 0 ? (
              <MetaChip dark={Boolean(heroImage)}>
                {record.categories.length} equipment {record.categories.length === 1 ? "category" : "categories"}
              </MetaChip>
            ) : null}
          </>
        }
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            {enquire}
            {record.websiteUrl ? (
              <a
                href={record.websiteUrl}
                target="_blank"
                rel="noreferrer nofollow"
                className={buttonStyles({ variant: "outline", size: "lg" })}
              >
                Manufacturer website
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            ) : (
              <Link
                href="#products"
                className={buttonStyles({ variant: heroImage ? "outline-inverse" : "outline", size: "lg" })}
              >
                View equipment
              </Link>
            )}
          </div>
        }
      />

      {record.description ? (
        <Section spacing="large" container="wide">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <span className="eyebrow">Overview</span>
              <h2 className="text-h1 text-ink">{copy.overview}.</h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <RichText value={record.description} className="prose-hn max-w-[68ch]" />
            </div>
          </div>
        </Section>
      ) : null}

      {record.categories.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl">
          <SectionHeader
            overline="Equipment categories"
            title="Ranges to explore."
            action={<ArrowLink href="/categories">All categories</ArrowLink>}
          />
          <ul className={`reveal-stagger mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6 ${fitColumns(record.categories.length).replace("sm:grid-cols-2 ", "")}`}>
            {record.categories.map((category) => (
              <li key={`${category.parentSlug}/${category.slug}`}>
                <CategoryCard
                  size="compact"
                  data={{
                    name: category.name,
                    href: categoryPath(category.slug, category.parentSlug),
                    image: null,
                  }}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section spacing="large" container="wide" anchorId="products">
        <SectionHeader
          overline="Products"
          title={`${copy.products}.`}
          description={`${total} product${total === 1 ? "" : "s"}, each quoted to your requirement.`}
        />
        <div className="mt-12 flex flex-col gap-10">
          {products.length === 0 ? (
            <EmptyState
              title="Products are being added"
              description={`${emptyMessage} Our team can still help with your requirement.`}
              action={enquire}
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
                buildQueryHref(basePath, searchParams, {
                  page: next === 1 ? null : next,
                })
              }
            />
          ) : null}
        </div>
      </Section>

      <PageCta
        background="pearl"
        title={brand ? `Sourcing ${record.name} equipment?` : `Planning equipment for ${record.name.toLowerCase()}?`}
        body="Share the department, quantities and timeline — we will prepare a consolidated quotation for your requirement."
        image={heroImage ?? undefined}
        actions={
          <>
            {enquire}
            <Link href="/contact" className={buttonStyles({ variant: "outline-inverse", size: "lg" })}>
              Talk to our team
            </Link>
          </>
        }
      />
    </>
  );
}

const INDEX_KIND: Record<string, VisualKind | "brand"> = {
  categories: "category",
  specialties: "specialty",
  solutions: "solution",
  applications: "application",
  brands: "brand",
};

const INDEX_EYEBROW: Record<string, string> = {
  categories: "Equipment catalogue",
  specialties: "Clinical specialties",
  solutions: "Healthcare solutions",
  applications: "Clinical environments",
  brands: "Manufacturers",
};

/**
 * The index of one taxonomy — every category, specialty, solution,
 * application or brand — each drawn with the card that suits it.
 */
export function TaxonomyIndex({
  title,
  description,
  trail,
  cards,
  emptyMessage,
  unit,
}: {
  title: string;
  description: string;
  trail: BreadcrumbItem[];
  cards: Array<{
    id: string;
    name: string;
    href: string;
    summary: string | null;
    image: PublicImage | null;
    productCount: number;
  }>;
  emptyMessage: string;
  unit: string;
}) {
  const kind = INDEX_KIND[unit] ?? "category";
  const clinical = kind === "specialty" || kind === "solution" || kind === "application";
  const heroImage = clinical ? (cards.find((card) => card.image)?.image ?? sceneVisual(title)) : null;
  const total = cards.reduce((sum, card) => sum + card.productCount, 0);

  return (
    <>
      <PageHero
        variant={heroImage ? "image" : "pearl"}
        trail={trail}
        eyebrow={INDEX_EYEBROW[unit] ?? title}
        title={title}
        description={description}
        image={heroImage}
        meta={
          cards.length > 0 ? (
            <>
              <MetaChip dark={Boolean(heroImage)}>
                <span className="size-1.5 rounded-full bg-cyan-500" />
                {cards.length} {unit}
              </MetaChip>
              {total > 0 ? <MetaChip dark={Boolean(heroImage)}>{total} linked products</MetaChip> : null}
            </>
          ) : undefined
        }
      />

      <Section spacing="large" container="wide" background={kind === "category" ? "pearl" : "default"}>
        {cards.length === 0 ? (
          <EmptyState
            title={`No ${unit} yet`}
            description={emptyMessage}
            action={
              <Link href="/contact" className={buttonStyles({})}>
                Ask our team
              </Link>
            }
          />
        ) : kind === "brand" ? (
          <ul className="reveal-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {cards.map((card) => (
              <li key={card.id}>
                <BrandCard data={{ name: card.name, href: card.href, image: card.image, count: card.productCount }} />
              </li>
            ))}
          </ul>
        ) : kind === "category" ? (
          <ul className="reveal-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {cards.map((card) => (
              <li key={card.id}>
                <CategoryCard
                  data={{ name: card.name, href: card.href, summary: card.summary, image: card.image, count: card.productCount }}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </li>
            ))}
          </ul>
        ) : (
          <ul className={`reveal-stagger grid grid-cols-1 gap-5 lg:gap-6 ${fitColumns(cards.length, 3)}`}>
            {cards.map((card) => (
              <li key={card.id}>
                <SceneCard
                  kind={kind as VisualKind}
                  data={{ name: card.name, href: card.href, summary: card.summary, image: card.image, count: card.productCount }}
                  aspect="landscape"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  cta="Explore"
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <PageCta
        title="Need help choosing equipment?"
        body="Tell us about the department or project. Our team will help shortlist equipment and prepare a quotation."
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
