import type { Metadata } from "next";
import Link from "next/link";

import { Clock, Mail } from "lucide-react";

import {
  Breadcrumb,
  buttonStyles,
  Container,
  Section,
  SectionHeader,
} from "@/components/ui";
import { formatPostDate } from "@/components/site/post-card";
import { ArrowLink, ArticleCard } from "@/components/site/cards";
import { RecordImage } from "@/components/site/media";
import { PageCta } from "@/components/site/page-cta";
import { appUrl } from "@/lib/site-config";
import { JsonLd } from "@/components/seo/json-ld";
import { RenderedSections, type StoredSection } from "@/cms/render-page";
import { getSiteSettings } from "@/server/settings/service";
import { articleJsonLd } from "@/server/seo/structured-data";
import { withSeoOverride } from "@/server/seo/overrides";
import { missingPage } from "@/server/seo/missing";
import { canPreview } from "@/server/preview";
import {
  morePosts,
  publicPost,
  publishedPostSlugs,
} from "@/server/blog/public";

type RouteParams = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await publishedPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

async function pageMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await publicPost(slug);
  if (!post) return { title: "Article not found" };

  const description = post.excerpt ?? undefined;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      ...(post.publishedAt
        ? { publishedTime: post.publishedAt.toISOString() }
        : {}),
      ...(post.authorName ? { authors: [post.authorName] } : {}),
      images: post.cover ? [{ url: post.cover.url }] : undefined,
    },
    // A draft is never indexed, even while an editor previews it. Spread, so a
    // published post keeps the site-wide robots setting.
    ...(post.status === "PUBLISHED"
      ? {}
      : { robots: { index: false, follow: false } }),
  };
}

export async function generateMetadata(route: RouteParams): Promise<Metadata> {
  const base = await pageMetadata(route);
  const { slug } = await route.params;
  return withSeoOverride(`/blog/${slug}`, base);
}

/** Minutes to read, from the words in the article's text sections. */
function readingMinutes(sections: StoredSection[], excerpt: string | null): number {
  const words = sections
    .flatMap((section) => {
      const content = (section.content ?? {}) as Record<string, unknown>;
      return Object.values(content).filter((value): value is string => typeof value === "string");
    })
    .concat(excerpt ?? "")
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function BlogPostPage({ params }: RouteParams) {
  const { slug } = await params;
  const post = await publicPost(slug);
  if (!post) return missingPage(`/blog/${slug}`);

  const published = post.status === "PUBLISHED";
  // Unpublished posts answer exactly like missing ones, except to staff in
  // preview who may view the blog.
  if (!published && !(await canPreview("BLOGS")))
    return missingPage(`/blog/${slug}`);

  const [settings, more] = await Promise.all([
    getSiteSettings(),
    morePosts(post.id),
  ]);
  const date = formatPostDate(post.publishedAt);
  const sections = post.sections as StoredSection[];
  const minutes = readingMinutes(sections, post.excerpt);
  const trail = [
    { label: "Home", href: "/" },
    { label: "Insights", href: "/blog" },
    { label: post.title },
  ];
  const url = `${appUrl()}/blog/${post.slug}`;
  const share = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { label: "X", href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}` },
  ];

  return (
    <>
      {published ? (
        <JsonLd
          data={articleJsonLd(
            {
              title: post.title,
              path: `/blog/${post.slug}`,
              description: post.excerpt,
              image: post.cover?.url ?? null,
              publishedAt: post.publishedAt ?? post.updatedAt,
              updatedAt: post.updatedAt,
              authorName: post.authorName,
            },
            settings,
          )}
        />
      ) : (
        <div className="bg-warning-50 border-warning-100 border-b">
          <Container className="text-body-sm text-warning-700 flex flex-wrap items-center justify-between gap-3 py-3">
            <span>
              Preview — this post is {post.status.toLowerCase()} and is not
              visible to the public.
            </span>
            <Link
              href={`/admin/blogs/${post.id}`}
              className="underline underline-offset-4"
            >
              Edit post
            </Link>
          </Container>
        </div>
      )}

      <article>
        <header className="bg-canvas relative overflow-hidden">
          <Container width="wide" className="pt-6">
            {/* The visible trail carries the BreadcrumbList structured data. */}
            <Breadcrumb items={trail} />
          </Container>
          <Container width="standard" className="flex flex-col items-start gap-6 pt-12 pb-14 lg:pt-16">
            <span className="eyebrow intro">Insight</span>
            <h1 className="intro text-safe font-display text-ink max-w-[24ch] text-[clamp(2.125rem,1.4rem+2.8vw,3.75rem)] leading-[1.06] font-semibold tracking-[-0.03em] [--i:1]">
              {post.title}
            </h1>
            {post.excerpt ? (
              <p className="intro text-lead text-ink-muted max-w-[60ch] [--i:2]">{post.excerpt}</p>
            ) : null}
            <div className="intro text-body-sm text-ink-muted flex flex-wrap items-center gap-x-5 gap-y-2 [--i:3]">
              {post.authorName ? (
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="bg-navy-950 flex size-8 items-center justify-center rounded-full text-[0.75rem] font-semibold text-white">
                    {post.authorName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}
                  </span>
                  <span className="text-ink font-medium">{post.authorName}</span>
                </span>
              ) : null}
              {date ? <time dateTime={post.publishedAt?.toISOString()}>{date}</time> : null}
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4" />
                {minutes} min read
              </span>
            </div>
          </Container>
        </header>

        {post.cover ? (
          <Container width="wide" className="-mt-px pt-10">
            <RecordImage
              kind="post"
              name={post.title}
              image={post.cover}
              sizes="(min-width: 1472px) 1400px, 100vw"
              priority
              frameClassName="aspect-[16/9] rounded-3xl border border-line sm:aspect-[21/9]"
            />
          </Container>
        ) : null}

        <div className="pt-6">
          <RenderedSections sections={sections} />
        </div>

        <Container width="narrow" className="pb-16">
          <div className="border-line flex flex-col gap-5 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-ink-subtle font-semibold tracking-[0.14em] uppercase">Share this article</p>
            <ul className="flex flex-wrap gap-2">
              {share.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: "outline", size: "sm" })}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}`}
                  className={buttonStyles({ variant: "outline", size: "sm" })}
                >
                  <Mail aria-hidden="true" className="size-4" />
                  Email
                </a>
              </li>
            </ul>
          </div>
        </Container>
      </article>

      {more.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl">
          <SectionHeader
            overline="Keep reading"
            title="More insights."
            action={<ArrowLink href="/blog">All articles</ArrowLink>}
          />
          <ul className="reveal-stagger mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((item) => (
              <li key={item.id}>
                <ArticleCard
                  data={{
                    title: item.title,
                    href: `/blog/${item.slug}`,
                    excerpt: item.excerpt,
                    image: item.cover,
                    date: item.publishedAt,
                    author: item.authorName,
                  }}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <PageCta
        title="Planning equipment for your facility?"
        body="Talk to our team about equipment lists, specifications and quotations."
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
