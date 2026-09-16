import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui";
import { prisma } from "@/server/db";
import { visitorHasPermission } from "@/server/permissions";
import { RenderedSections, type StoredSection } from "@/cms/render-page";

type RouteParams = { params: Promise<{ slug: string[] }> };

/**
 * CMS pages are single-segment, so a deeper path is never a page — it belongs
 * to a route this catch-all must not answer for.
 */
function slugFrom(segments: string[]): string | null {
  return segments.length === 1 ? segments[0] : null;
}

async function loadPage(segments: string[]) {
  const slug = slugFrom(segments);
  if (!slug) return null;

  return prisma.page.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          order: true,
          enabled: true,
          anchorId: true,
          content: true,
          design: true,
        },
      },
    },
  });
}

/**
 * Unpublished pages are visible only to staff who may view pages, so an editor
 * can check their work before publishing. Everyone else gets a 404 — the same
 * response as a slug that does not exist, so an unpublished URL cannot be
 * probed for.
 */
async function mayPreview(): Promise<boolean> {
  return visitorHasPermission("PAGES", "VIEW");
}

/**
 * Prerenders published pages when the database is reachable at build time.
 *
 * The image is built in environments that have no database — Coolify builds
 * before the service is linked — so an unreachable database degrades to
 * on-demand rendering rather than failing the build. Nothing is lost either
 * way: unlisted slugs render dynamically and are cached from then on.
 */
export async function generateStaticParams() {
  try {
    const pages = await prisma.page.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { slug: true },
    });

    return pages.map((page) => ({ slug: [page.slug] }));
  } catch (error) {
    console.warn(
      "Skipping CMS page prerendering: database unavailable at build time",
      error instanceof Error ? error.message : "unknown",
    );
    return [];
  }
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);

  if (!page) return { title: "Page not found" };

  return {
    title: page.title,
    alternates: { canonical: `/${page.slug}` },
    // Drafts must never be indexed even while a signed-in editor previews them.
    robots:
      page.status === "PUBLISHED" ? undefined : { index: false, follow: false },
  };
}

export default async function CmsPage({ params }: RouteParams) {
  const { slug } = await params;
  const page = await loadPage(slug);

  if (!page) notFound();

  const published = page.status === "PUBLISHED";
  if (!published && !(await mayPreview())) notFound();

  return (
    <>
      {published ? null : (
        <div className="bg-warning-50 border-warning-100 border-b">
          <Container className="text-body-sm text-warning-700 flex flex-wrap items-center justify-between gap-3 py-3">
            <span>
              Preview — this page is {page.status.toLowerCase()} and is not
              visible to the public.
            </span>
            <Link
              href={`/admin/pages/${page.id}`}
              className="underline underline-offset-4"
            >
              Edit page
            </Link>
          </Container>
        </div>
      )}

      <RenderedSections sections={page.sections as StoredSection[]} />
    </>
  );
}
