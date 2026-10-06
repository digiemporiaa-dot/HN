import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Breadcrumb,
  Container,
  EmptyState,
  Pagination,
  Section,
  SectionHeader,
} from "@/components/ui";
import { PostCard } from "@/components/site/post-card";
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

  return (
    <>
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
      <Container className="pt-6">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />
      </Container>

      <Section spacing="normal" container="standard">
        <SectionHeader
          title="Blog"
          description="Articles on medical equipment, hospital planning and procurement."
          align="left"
        />

        {posts.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No articles yet"
              description="New articles will appear here."
            />
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="mt-10">
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
    </>
  );
}
