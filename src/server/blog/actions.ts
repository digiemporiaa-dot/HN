"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { clearUsage, recordUsage } from "@/server/media/service";
import { syncPublicPath } from "@/server/seo/redirects";
import {
  placeholderRefusal,
  sectionsWithPlaceholders,
} from "@/server/cms/placeholders";
import { postSchema } from "@/lib/validation/blog";
import { slugify } from "@/lib/utils/slug";

export type BlogActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

const SAVE_FAILED =
  "The post could not be saved. Check the highlighted fields.";

function readPost(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const slug = String(formData.get("slug") ?? "").trim() || slugify(title);
  return postSchema.safeParse({
    title,
    slug,
    excerpt: String(formData.get("excerpt") ?? ""),
    authorName: String(formData.get("authorName") ?? ""),
    coverId: String(formData.get("coverId") ?? ""),
    featured: formData.get("featured") === "on",
    status: formData.get("status") ?? "DRAFT",
  });
}

function fieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors)
      .filter(([, messages]) => messages?.[0])
      .map(([field, messages]) => [field, messages![0]]),
  );
}

/** A cover must be an image that exists; anything else is quietly dropped. */
async function usableCover(coverId: string | null): Promise<string | null> {
  if (!coverId) return null;
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: coverId, deletedAt: null, kind: { in: ["IMAGE", "VECTOR"] } },
    select: { id: true },
  });
  return asset?.id ?? null;
}

async function recordCoverUsage(postId: string, coverId: string | null) {
  await clearUsage({
    entityType: "BlogPost",
    entityId: postId,
    field: "cover",
  });
  if (coverId) {
    await recordUsage({
      assetId: coverId,
      entityType: "BlogPost",
      entityId: postId,
      field: "cover",
    });
  }
}

function revalidateBlog(...slugs: string[]): void {
  revalidatePath("/admin/blogs");
  revalidatePath("/blog");
  for (const slug of slugs) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function createPostAction(
  _previous: BlogActionState,
  formData: FormData,
): Promise<BlogActionState> {
  const actor = await requirePermission("BLOGS", "CREATE");

  const parsed = readPost(formData);
  if (!parsed.success) {
    return { error: SAVE_FAILED, fieldErrors: fieldErrors(parsed.error) };
  }
  // A new post starts as a draft: it is written before it is published.
  const data = { ...parsed.data, status: "DRAFT" as const };

  if (await prisma.blogPost.findUnique({ where: { slug: data.slug } })) {
    return {
      error: SAVE_FAILED,
      fieldErrors: {
        slug: "Another post, or a deleted one, already uses that slug.",
      },
    };
  }

  const coverId = await usableCover(data.coverId);
  const post = await prisma.blogPost.create({
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      authorName: data.authorName ?? actor.name,
      coverId,
      featured: data.featured,
      status: "DRAFT",
      // Every post opens with a body to write into. The placeholder keeps it
      // from being published before the text is written.
      sections: {
        create: {
          type: "RICH_TEXT",
          order: 0,
          enabled: true,
          content: {
            body: "[[Write the post here. Blank lines start a new paragraph.]]",
          } as Prisma.InputJsonValue,
          design: { container: "narrow" } as Prisma.InputJsonValue,
        },
      },
    },
    select: { id: true },
  });
  await recordCoverUsage(post.id, coverId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "BLOG_POST_CREATED",
    module: "BLOGS",
    entityType: "BlogPost",
    entityId: post.id,
    summary: `Created the post “${data.title}” (/blog/${data.slug})`,
  });

  revalidatePath("/admin/blogs");
  redirect(`/admin/blogs/${post.id}`);
}

export async function updatePostAction(
  _previous: BlogActionState,
  formData: FormData,
): Promise<BlogActionState> {
  const actor = await requirePermission("BLOGS", "EDIT");
  const postId = String(formData.get("postId") ?? "");

  const parsed = readPost(formData);
  if (!parsed.success) {
    return { error: SAVE_FAILED, fieldErrors: fieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const post = await prisma.blogPost.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!post) return { error: "That post no longer exists." };

  // Publishing is its own permission, and so is taking a post down.
  if ((data.status === "PUBLISHED") !== (post.status === "PUBLISHED")) {
    await requirePermission("BLOGS", "PUBLISH");
  }

  if (data.status === "PUBLISHED") {
    const unfinished = await sectionsWithPlaceholders({ postId: post.id });
    if (unfinished.length > 0) {
      return {
        error: placeholderRefusal(unfinished),
        fieldErrors: { status: "Finish the placeholders first." },
      };
    }
  }

  const clash = await prisma.blogPost.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (clash && clash.id !== post.id) {
    return {
      error: SAVE_FAILED,
      fieldErrors: {
        slug: "Another post, or a deleted one, already uses that slug.",
      },
    };
  }

  const coverId = await usableCover(data.coverId);
  await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      authorName: data.authorName,
      coverId,
      featured: data.featured,
      status: data.status,
      // The date a post first went live is its date; unpublishing clears it.
      publishedAt:
        data.status === "PUBLISHED" ? (post.publishedAt ?? new Date()) : null,
    },
  });
  await recordCoverUsage(post.id, coverId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action:
      post.status !== data.status
        ? "BLOG_POST_STATUS_CHANGED"
        : "BLOG_POST_UPDATED",
    module: "BLOGS",
    entityType: "BlogPost",
    entityId: post.id,
    summary: `${data.title} (/blog/${data.slug}) — ${data.status}`,
    metadata: { from: post.status, to: data.status, slug: data.slug },
  });

  // A live post that changes address leaves a redirect behind.
  await syncPublicPath({
    before: post.status === "PUBLISHED" ? `/blog/${post.slug}` : null,
    after: data.status === "PUBLISHED" ? `/blog/${data.slug}` : null,
    actorId: actor.id,
  });

  revalidatePath(`/admin/blogs/${post.id}`);
  revalidateBlog(post.slug, data.slug);
  return { success: "Post saved." };
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("BLOGS", "DELETE");
  const postId = String(formData.get("postId") ?? "");
  const post = await prisma.blogPost.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, slug: true, title: true },
  });
  if (!post) redirect("/admin/blogs");

  // Soft delete, as for pages: a post takes its sections with it, and a
  // mistaken delete should be a restore, not a rewrite.
  await prisma.blogPost.update({
    where: { id: post.id },
    data: { deletedAt: new Date(), status: "ARCHIVED", publishedAt: null },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "BLOG_POST_DELETED",
    module: "BLOGS",
    entityType: "BlogPost",
    entityId: post.id,
    summary: `Deleted the post “${post.title}” (/blog/${post.slug})`,
  });

  revalidateBlog(post.slug);
  redirect("/admin/blogs");
}

export async function restorePostAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("BLOGS", "DELETE");
  const postId = String(formData.get("postId") ?? "");
  const post = await prisma.blogPost.findFirst({
    where: { id: postId, deletedAt: { not: null } },
    select: { id: true, title: true, slug: true },
  });
  if (!post) redirect("/admin/blogs");

  // Restored as a draft: being deleted is not a reason to go back online.
  await prisma.blogPost.update({
    where: { id: post.id },
    data: { deletedAt: null, status: "DRAFT", publishedAt: null },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "BLOG_POST_RESTORED",
    module: "BLOGS",
    entityType: "BlogPost",
    entityId: post.id,
    summary: `Restored the post “${post.title}” as a draft`,
  });

  revalidatePath("/admin/blogs");
  redirect(`/admin/blogs/${post.id}`);
}
