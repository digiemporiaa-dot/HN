import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { buttonStyles, EmptyState, Pagination, Section } from "@/components/ui";
import { ArticleCard, formatDate } from "@/components/site/cards";
import { RecordImage } from "@/components/site/media";
import { MetaChip, PageHero } from "@/components/site/page-hero";
import { PageCta } from "@/components/site/page-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { itemListJsonLd } from "@/server/seo/structured-data";
import { listingMetadata } from "@/server/seo/listing";
import { withSeoOverride } from "@/server/seo/overrides";
import { publicPostListing } from "@/server/blog/public";
import { buildQueryHref, readPageParam } from "@/lib/utils/query";

const PAGE_SIZE = 12;

const BASE_METADATA: Metadata = {
  title: "Blog",
  description:
    "Articles on medical equipment, hospital planning and procurement.",
  alternates: { canonical: "/blog" },
};

type RouteParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: RouteParams): Promise<Metadata> {
  return withSeoOverride(
    "/blog",
    listingMetadata(BASE_METADATA, "/blog", await searchParams),
  );
}

export default async function BlogIndex({ searchParams }: RouteParams) {
  const params = await searchParams;
  const page = readPageParam(params.page);
  const { total, posts } = await publicPostListing(page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Beyond the last page is not an empty page, it is no page. Not logged as a
  // missing address: the address is /blog, which exists.
  if (page > totalPages) notFound();

  // The first article on the first page is the featured story.
  const lead = page === 1 ? (posts[0] ?? null) : null;
  const rest = page === 1 ? posts.slice(1) : posts;
  const card = (post: (typeof posts)[number]) => ({
    title: post.title,
    href: `/blog/${post.slug}`,
    excerpt: post.excerpt,
    image: post.cover,
    date: post.publishedAt,
    author: post.authorName,
  });

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Insights" }]}
        eyebrow="Insights"
        title="Guidance for equipment planning and procurement."
        description="Practical articles for hospital administrators, biomedical engineers and procurement teams — from planning a new facility to comparing equipment."
        meta={
          total > 0 ? (
            <MetaChip>
              <BookOpen aria-hidden="true" className="size-3.5" />
              {total} article{total === 1 ? "" : "s"}
            </MetaChip>
          ) : undefined
        }
      />

      <JsonLd
        data={itemListJsonLd(
          "Blog",
          posts.map((post) => ({
            name: post.title,
            path: `/blog/${post.slug}`,
          })),
          (page - 1) * PAGE_SIZE,
        )}
      />

      <Section spacing="large" container="wide">
        {posts.length === 0 ? (
          <EmptyState
            icon={<BookOpen aria-hidden="true" className="size-6" />}
            title="Articles are on their way"
            description="New guidance on equipment planning and procurement will appear here."
            action={
              <Link href="/products" className={buttonStyles({})}>
                Browse equipment
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-14">
            {lead ? (
              <article className="group border-line bg-surface relative grid overflow-hidden rounded-3xl border shadow-[var(--shadow-card)] transition-[box-shadow] duration-[var(--duration-slow)] hover:shadow-[var(--shadow-card-hover)] lg:grid-cols-[1.25fr_1fr]">
                <RecordImage
                  kind="post"
                  name={lead.title}
                  image={lead.cover}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  priority
                  frameClassName="zoom-media aspect-[16/10] lg:aspect-auto lg:min-h-[26rem]"
                />
                <div className="flex flex-col justify-center gap-5 p-7 sm:p-10 lg:p-12">
                  <p className="text-caption text-ink-subtle flex flex-wrap items-center gap-3">
                    <span className="text-primary font-semibold tracking-[0.12em] uppercase">Featured</span>
                    {lead.publishedAt ? <time dateTime={lead.publishedAt.toISOString()}>{formatDate(lead.publishedAt)}</time> : null}
                  </p>
                  <h2 className="text-h1 text-ink group-hover:text-primary transition-colors">
                    <Link href={`/blog/${lead.slug}`} className="after:absolute after:inset-0">
                      {lead.title}
                    </Link>
                  </h2>
                  {lead.excerpt ? <p className="text-body-lg text-ink-muted">{lead.excerpt}</p> : null}
                  <span className="text-body-sm text-primary inline-flex items-center gap-2 font-semibold">
                    Read article
                    <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
                  </span>
                </div>
              </article>
            ) : null}

            {rest.length > 0 ? (
              <ul className="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <li key={post.id}>
                    <ArticleCard data={card(post)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-12">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              buildHref={(next) =>
                buildQueryHref("/blog", params, {
                  page: next === 1 ? null : next,
                })
              }
            />
          </div>
        ) : null}
      </Section>

      <PageCta
        background="pearl"
        eyebrow="Talk to an expert"
        title="Have a question about your project?"
        body="Our team helps with equipment lists, specifications and quotations for departments and new facilities."
        actions={
          <>
            <Link href="/contact" className={buttonStyles({ size: "lg" })}>
              Contact our team
            </Link>
            <Link href="/products" className={buttonStyles({ variant: "outline-inverse", size: "lg" })}>
              Browse equipment
            </Link>
          </>
        }
      />
    </>
  );
}
