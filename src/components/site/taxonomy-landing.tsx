import Link from "next/link";
import { ExternalLink } from "lucide-react";

import {
  Breadcrumb,
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
import type { ProductCardData, PublicImage } from "@/server/products/public";
import type { TaxonomyRecord } from "@/server/catalogue/public";

/* eslint-disable @next/next/no-img-element -- catalogue images are served from
   our own media route at their stored size. */

/**
 * The page a brand, specialty, solution or application gets.
 *
 * The three that have a publishing lifecycle carry identical fields, and an
 * application is the same page with fewer of them filled in, so all four share
 * this rather than four files differing only in nouns. A category does not:
 * it nests, it owns its products outright, and its URL has two levels.
 */
export function TaxonomyLanding({
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

      {record.banner ? (
        <div className="bg-surface-muted">
          <img
            src={record.banner.url}
            alt={record.banner.alt}
            className="h-48 w-full object-cover sm:h-64"
          />
        </div>
      ) : null}

      <Container className="pt-6">
        <Breadcrumb items={trail} />
      </Container>

      <Section spacing="normal" container="standard">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-5">
            {record.image ? (
              <img
                src={record.image.url}
                alt={record.image.alt}
                className="border-line bg-surface size-20 shrink-0 rounded-lg border object-contain p-2"
              />
            ) : null}

            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-h1 text-ink">{record.name}</h1>
              {record.shortDescription ? (
                <p className="text-body-lg text-ink-muted">
                  {record.shortDescription}
                </p>
              ) : null}
            </div>
          </div>

          {record.websiteUrl ? (
            <div>
              <a
                href={record.websiteUrl}
                target="_blank"
                rel="noreferrer nofollow"
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Manufacturer website
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </div>
          ) : null}

          {record.description ? (
            <div className="prose-hn max-w-[70ch]">
              <RichText value={record.description} />
            </div>
          ) : null}

          {record.categories.length > 0 ? (
            <div className="border-line flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-5">
              <span className="text-caption text-ink-subtle">Categories</span>
              {record.categories.map((category) => (
                <Link
                  key={`${category.parentSlug}/${category.slug}`}
                  href={categoryPath(category.slug, category.parentSlug)}
                  className="text-body-sm text-primary underline underline-offset-4"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </Section>

      <Section spacing="normal" container="standard" background="light">
        <SectionHeader
          title="Products"
          description={`${total} product${total === 1 ? "" : "s"}`}
          align="left"
        />

        <div className="mt-8 flex flex-col gap-8">
          {products.length === 0 ? (
            <EmptyState title="Nothing listed yet" description={emptyMessage} />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          )}

          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            buildHref={(next) =>
              buildQueryHref(basePath, searchParams, {
                page: next === 1 ? null : next,
              })
            }
          />
        </div>
      </Section>
    </>
  );
}

/**
 * The index of one taxonomy — every brand, every specialty.
 *
 * Counts are shown because the number of products behind a label is the thing
 * that tells a visitor whether following it is worth the click.
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
  return (
    <>
      <Container className="pt-6">
        <Breadcrumb items={trail} />
      </Container>

      <Section spacing="normal" container="standard">
        <SectionHeader title={title} description={description} align="left" />

        {cards.length === 0 ? (
          <div className="mt-8">
            <EmptyState title={`No ${unit} yet`} description={emptyMessage} />
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <li key={card.id}>
                <Link
                  href={card.href}
                  className="border-line bg-surface hover:border-line-strong group flex h-full gap-4 rounded-lg border p-5 transition-colors"
                >
                  {card.image ? (
                    <img
                      src={card.image.url}
                      alt={card.image.alt}
                      loading="lazy"
                      className="bg-surface-muted size-16 shrink-0 rounded-md object-contain p-1.5"
                    />
                  ) : null}

                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-body text-ink group-hover:text-primary font-medium transition-colors">
                      {card.name}
                    </span>
                    {card.summary ? (
                      <span className="text-body-sm text-ink-muted line-clamp-2">
                        {card.summary}
                      </span>
                    ) : null}
                    <span className="text-caption text-ink-subtle">
                      {card.productCount} product
                      {card.productCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

/* eslint-enable @next/next/no-img-element */
