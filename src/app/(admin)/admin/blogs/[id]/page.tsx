import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SectionsPanel } from "@/components/admin/sections/sections-panel";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { deletePostAction } from "@/server/blog/actions";
import { pickableMedia } from "@/server/media/pickable";
import { describeSection } from "@/server/cms/placeholders";
import { previewHref } from "@/server/preview";
import { hasPlaceholder } from "@/lib/cms/placeholders";
import { PostForm } from "../post-form";

export const metadata: Metadata = {
  title: "Edit post",
  robots: { index: false, follow: false },
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("BLOGS", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;

  const [post, media] = await Promise.all([
    prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        authorName: true,
        coverId: true,
        featured: true,
        status: true,
        updatedAt: true,
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
            updatedAt: true,
          },
        },
      },
    }),
    pickableMedia(),
  ]);
  if (!post) notFound();

  const canEdit = can("BLOGS", "EDIT");
  const path = `/blog/${post.slug}`;
  const unfinished = post.sections
    .filter((section) => section.enabled && hasPlaceholder(section.content))
    .map((section) => describeSection(section.type, section.content));

  return (
    <AdminPage>
      <AdminPageHeader
        title={post.title}
        description={path}
        backHref="/admin/blogs"
        backLabel="Back to blog"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={post.status} />
            <Link
              href={post.status === "PUBLISHED" ? path : previewHref(path)}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
            >
              {post.status === "PUBLISHED" ? "View post" : "Preview"}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
            {can("BLOGS", "DELETE") ? (
              <form action={deletePostAction}>
                <input type="hidden" name="postId" value={post.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2
                    aria-hidden="true"
                    className="text-danger-600 size-4"
                  />
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      {unfinished.length > 0 ? (
        <div
          role="status"
          className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm flex flex-col gap-1 rounded-md border p-4"
        >
          <p className="font-medium">
            {unfinished.length} section{unfinished.length === 1 ? "" : "s"}{" "}
            still {unfinished.length === 1 ? "has" : "have"} [[placeholders]] to
            replace before this post can be published:
          </p>
          <p>{unfinished.join(", ")}</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Post details</CardTitle>
        </CardHeader>
        <CardContent>
          <PostForm
            mode="edit"
            postId={post.id}
            media={media}
            canPublish={can("BLOGS", "PUBLISH")}
            readOnly={!canEdit}
            version={post.updatedAt.toISOString()}
            initial={{
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt ?? "",
              authorName: post.authorName ?? "",
              coverId: post.coverId ?? "",
              featured: post.featured,
              status: post.status,
            }}
          />
        </CardContent>
      </Card>

      <SectionsPanel
        owner={{ kind: "post", id: post.id }}
        sections={post.sections}
        canEdit={canEdit}
        emptyDescription="The article is built from sections stacked top to bottom: text, images, a video, an FAQ. Add the first one below."
      />
    </AdminPage>
  );
}
