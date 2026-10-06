import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb, Container, Section, SectionHeader } from "@/components/ui";
import { PostCard, formatPostDate } from "@/components/site/post-card";
import { JsonLd } from "@/components/seo/json-ld";
import { RenderedSections, type StoredSection } from "@/cms/render-page";
import { getSiteSettings } from "@/server/settings/service";
import { articleJsonLd, breadcrumbJsonLd } from "@/server/seo/structured-data";
import { withSeoOverride } from "@/server/seo/overrides";
import { missingPage } from "@/server/seo/missing";
import { canPreview } from "@/server/preview";
import {
  morePosts,
  publicPost,
  publishedPostSlugs,
} from "@/server/blog/public";

/* eslint-disable @next/next/no-img-element -- the cover is served from our own
   media route at its stored size. */

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
  const trail = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: post.title },
  ];

  return (
    <>
      {published ? (
        <>
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
          <JsonLd data={breadcrumbJsonLd(trail)} />
        </>
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

      <Container className="pt-6">
        <Breadcrumb items={trail} />
      </Container>

      <article>
        <Container width="narrow" className="flex flex-col gap-5 pt-8 pb-4">
          <h1 className="font-display text-h1 text-ink text-balance">
            {post.title}
          </h1>
          {date || post.authorName ? (
            <p className="text-body-sm text-ink-muted">
              {date ? (
                <time dateTime={post.publishedAt?.toISOString()}>{date}</time>
              ) : null}
              {date && post.authorName ? " · " : null}
              {post.authorName ? <span>{`By ${post.authorName}`}</span> : null}
            </p>
          ) : null}
          {post.excerpt ? (
            <p className="text-body-lg text-ink-muted">{post.excerpt}</p>
          ) : null}
          {post.cover ? (
            <img
              src={post.cover.url}
              alt={post.cover.alt}
              className="bg-surface-muted mt-2 aspect-video w-full rounded-lg object-cover"
            />
          ) : null}
        </Container>

        <RenderedSections sections={post.sections as StoredSection[]} />
      </article>

      {more.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader title="More articles" align="left" />
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((item) => (
              <PostCard key={item.id} post={item} />
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

/* eslint-enable @next/next/no-img-element */
