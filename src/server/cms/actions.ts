"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { clearUsage, recordUsage } from "@/server/media/service";
import {
  contentSchemaFor,
  defaultsFor,
  getSectionDefinition,
} from "@/cms/sections/definitions";
import {
  CARD_STYLE,
  DEFAULT_SECTION_DESIGN as D,
  IMAGE_POSITION,
  SECTION_ALIGN,
  SECTION_BACKGROUND,
  SECTION_COLUMNS,
  SECTION_CONTAINER,
  SECTION_SPACING,
} from "@/lib/design/section-options";
import {
  addSectionSchema,
  anchorIdSchema,
  moveSectionSchema,
  pageIdSchema,
  pageSchema,
  sectionIdSchema,
} from "@/lib/validation/cms";

export type CmsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/* ------------------------------------------------------------------ pages -- */

export async function createPageAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  const actor = await requirePermission("PAGES", "CREATE");

  const parsed = pageSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    status: formData.get("status") ?? "DRAFT",
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        ...(flattened.title?.[0] ? { title: flattened.title[0] } : {}),
        ...(flattened.slug?.[0] ? { slug: flattened.slug[0] } : {}),
      },
    };
  }

  const clash = await prisma.page.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash) return { fieldErrors: { slug: "A page already uses that slug." } };

  const page = await prisma.page.create({
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, slug: true },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_CREATED",
    module: "PAGES",
    entityType: "Page",
    entityId: page.id,
    summary: `Created page /${page.slug}`,
  });

  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${page.id}`);
}

export async function updatePageAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  const actor = await requirePermission("PAGES", "EDIT");

  const pageId = String(formData.get("pageId") ?? "");
  const parsed = pageSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        ...(flattened.title?.[0] ? { title: flattened.title[0] } : {}),
        ...(flattened.slug?.[0] ? { slug: flattened.slug[0] } : {}),
      },
    };
  }

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!page) return { error: "That page no longer exists." };

  // Publishing is a separate permission from editing.
  if (parsed.data.status === "PUBLISHED" && page.status !== "PUBLISHED") {
    await requirePermission("PAGES", "PUBLISH");
  }

  const clash = await prisma.page.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash && clash.id !== page.id) {
    return { fieldErrors: { slug: "A page already uses that slug." } };
  }

  await prisma.page.update({
    where: { id: page.id },
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      status: parsed.data.status,
      // Re-publishing keeps the original date; unpublishing clears it, so the
      // column always means "published since", never "was published once".
      publishedAt:
        parsed.data.status === "PUBLISHED"
          ? (page.publishedAt ?? new Date())
          : null,
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: page.status !== parsed.data.status ? "PAGE_STATUS_CHANGED" : "PAGE_UPDATED",
    module: "PAGES",
    entityType: "Page",
    entityId: page.id,
    summary: `${parsed.data.title} (/${parsed.data.slug}) — ${parsed.data.status}`,
    metadata: { from: page.status, to: parsed.data.status, slug: parsed.data.slug },
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${page.id}`);
  revalidatePath(`/${page.slug}`);
  revalidatePath(`/${parsed.data.slug}`);

  return { success: "Page saved." };
}

export async function deletePageAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("PAGES", "DELETE");

  const parsed = pageIdSchema.safeParse({ pageId: formData.get("pageId") });
  if (!parsed.success) redirect("/admin/pages");

  const page = await prisma.page.findFirst({
    where: { id: parsed.data.pageId, deletedAt: null },
    select: { id: true, slug: true, title: true },
  });
  if (!page) redirect("/admin/pages");

  // Soft delete: a page removed by mistake takes its whole section tree with
  // it, and that is not something an editor can reconstruct from memory.
  await prisma.page.update({
    where: { id: page.id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_DELETED",
    module: "PAGES",
    entityType: "Page",
    entityId: page.id,
    summary: `Deleted ${page.title} (/${page.slug})`,
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/${page.slug}`);
  redirect("/admin/pages");
}

/* --------------------------------------------------------------- sections -- */

/**
 * Rewrites a section's media usage rows to match its current content.
 *
 * Cleared first rather than merged, so an image swapped out of a section stops
 * counting as used the moment it is replaced.
 */
async function recordMediaUsage(
  sectionId: string,
  type: string,
  content: unknown,
): Promise<void> {
  await clearUsage({
    entityType: "PageSection",
    entityId: sectionId,
    field: "content",
  });

  const definition = getSectionDefinition(type);
  if (!definition) return;

  const values = (content ?? {}) as Record<string, unknown>;

  for (const field of definition.fields) {
    if (field.kind !== "media") continue;
    const assetId = values[field.name];
    if (typeof assetId !== "string" || !assetId) continue;

    await recordUsage({
      assetId,
      entityType: "PageSection",
      entityId: sectionId,
      field: "content",
    });
  }
}

async function pageForSection(sectionId: string) {
  return prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: { id: true, pageId: true, type: true, order: true, page: { select: { slug: true } } },
  });
}

export async function addSectionAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  const actor = await requirePermission("PAGES", "EDIT");

  const parsed = addSectionSchema.safeParse({
    pageId: formData.get("pageId"),
    type: formData.get("type"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const defaults = defaultsFor(parsed.data.type);
  if (!defaults) return { error: "That section type is not available." };

  const page = await prisma.page.findFirst({
    where: { id: parsed.data.pageId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!page) return { error: "That page no longer exists." };

  const last = await prisma.pageSection.findFirst({
    where: { pageId: page.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const section = await prisma.pageSection.create({
    data: {
      pageId: page.id,
      type: parsed.data.type as never,
      order: (last?.order ?? -1) + 1,
      content: defaults.content as never,
      design: defaults.design as never,
    },
    select: { id: true },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_SECTION_ADDED",
    module: "PAGES",
    entityType: "PageSection",
    entityId: section.id,
    summary: `Added ${parsed.data.type} to /${page.slug}`,
  });

  revalidatePath(`/admin/pages/${page.id}`);
  revalidatePath(`/${page.slug}`);
  return { success: "Section added." };
}

export async function updateSectionAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  const actor = await requirePermission("PAGES", "EDIT");

  const sectionId = String(formData.get("sectionId") ?? "");
  const section = await pageForSection(sectionId);
  if (!section) return { error: "That section no longer exists." };

  const definition = getSectionDefinition(section.type);
  const schema = contentSchemaFor(section.type);
  if (!definition || !schema) return { error: "That section type is not available." };

  // Content arrives as flat form fields; repeaters are posted as JSON because
  // a nested list cannot be expressed in form encoding without inventing one.
  const raw: Record<string, unknown> = {};
  for (const field of definition.fields) {
    if (field.kind === "repeater") {
      const json = String(formData.get(field.name) ?? "[]");
      try {
        raw[field.name] = JSON.parse(json);
      } catch {
        raw[field.name] = [];
      }
    } else {
      raw[field.name] = String(formData.get(field.name) ?? "");
    }
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const anchor = anchorIdSchema.safeParse(formData.get("anchorId") ?? "");
  if (!anchor.success) {
    return { fieldErrors: { anchorId: anchor.error.issues[0].message } };
  }

  const pick = <T extends readonly string[]>(
    name: string,
    allowed: T,
    fallback: T[number],
  ): T[number] => {
    const value = String(formData.get(name) ?? "");
    return (allowed as readonly string[]).includes(value)
      ? (value as T[number])
      : fallback;
  };

  // Design is rebuilt from the enumerated options rather than trusted from the
  // form, so a tampered request cannot introduce a value the system never offers.
  const design = {
    spacing: pick("design.spacing", SECTION_SPACING, D.spacing),
    container: pick("design.container", SECTION_CONTAINER, D.container),
    background: pick("design.background", SECTION_BACKGROUND, D.background),
    align: pick("design.align", SECTION_ALIGN, D.align!),
    columns: pick("design.columns", SECTION_COLUMNS, D.columns!),
    cardStyle: pick("design.cardStyle", CARD_STYLE, D.cardStyle!),
    imagePosition: pick(
      "design.imagePosition",
      IMAGE_POSITION,
      D.imagePosition!,
    ),
  };

  const content = parsed.data as Record<string, unknown>;

  await prisma.pageSection.update({
    where: { id: section.id },
    data: {
      content: content as never,
      design: design as never,
      anchorId: anchor.data || null,
      enabled: formData.get("enabled") === "on",
    },
  });

  // Track which media this section references so the library can warn before
  // one of these images is deleted.
  await recordMediaUsage(section.id, section.type, content);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_SECTION_UPDATED",
    module: "PAGES",
    entityType: "PageSection",
    entityId: section.id,
    summary: `Updated ${section.type} on /${section.page.slug}`,
  });

  revalidatePath(`/admin/pages/${section.pageId}`);
  revalidatePath(`/${section.page.slug}`);
  return { success: "Section saved." };
}

export async function duplicateSectionAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("PAGES", "EDIT");

  const parsed = sectionIdSchema.safeParse({
    sectionId: formData.get("sectionId"),
  });
  if (!parsed.success) return;

  const source = await prisma.pageSection.findUnique({
    where: { id: parsed.data.sectionId },
    select: {
      pageId: true,
      type: true,
      order: true,
      content: true,
      design: true,
      enabled: true,
      page: { select: { slug: true } },
    },
  });
  if (!source) return;

  // Everything after the original shifts down so the copy sits directly
  // beneath it rather than at the end of the page.
  const [, copy] = await prisma.$transaction([
    prisma.pageSection.updateMany({
      where: { pageId: source.pageId, order: { gt: source.order } },
      data: { order: { increment: 1 } },
    }),
    prisma.pageSection.create({
      data: {
        pageId: source.pageId,
        type: source.type,
        order: source.order + 1,
        content: source.content as never,
        design: source.design as never,
        enabled: source.enabled,
      },
      select: { id: true },
    }),
  ]);

  // The copy references the same media as the original, so it needs its own
  // usage rows; otherwise the library would under-count and offer to delete an
  // asset that is still on the page.
  await recordMediaUsage(copy.id, source.type, source.content);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_SECTION_DUPLICATED",
    module: "PAGES",
    entityType: "PageSection",
    entityId: parsed.data.sectionId,
  });

  revalidatePath(`/admin/pages/${source.pageId}`);
  revalidatePath(`/${source.page.slug}`);
}

export async function moveSectionAction(formData: FormData): Promise<void> {
  await requirePermission("PAGES", "EDIT");

  const parsed = moveSectionSchema.safeParse({
    sectionId: formData.get("sectionId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) return;

  const section = await pageForSection(parsed.data.sectionId);
  if (!section) return;

  const neighbour = await prisma.pageSection.findFirst({
    where: {
      pageId: section.pageId,
      order:
        parsed.data.direction === "up"
          ? { lt: section.order }
          : { gt: section.order },
    },
    orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.pageSection.update({
      where: { id: section.id },
      data: { order: neighbour.order },
    }),
    prisma.pageSection.update({
      where: { id: neighbour.id },
      data: { order: section.order },
    }),
  ]);

  revalidatePath(`/admin/pages/${section.pageId}`);
  revalidatePath(`/${section.page.slug}`);
}

export async function deleteSectionAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("PAGES", "EDIT");

  const parsed = sectionIdSchema.safeParse({
    sectionId: formData.get("sectionId"),
  });
  if (!parsed.success) return;

  const section = await pageForSection(parsed.data.sectionId);
  if (!section) return;

  await prisma.pageSection.delete({ where: { id: section.id } });
  await clearUsage({
    entityType: "PageSection",
    entityId: section.id,
    field: "content",
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_SECTION_DELETED",
    module: "PAGES",
    entityType: "PageSection",
    entityId: section.id,
    summary: `Removed ${section.type} from /${section.page.slug}`,
  });

  revalidatePath(`/admin/pages/${section.pageId}`);
  revalidatePath(`/${section.page.slug}`);
}
