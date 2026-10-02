"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { requireStaff } from "@/server/auth/guards";
import {
  resolveOwner,
  sectionWithOwner,
  siblingsOf,
  type OwnerRef,
  type SectionOwner,
} from "./section-owner";
import {
  HOME_SLUG,
  homePageRecord,
  isHomeSlug,
  pagePublicPath,
  starterHomeSections,
} from "./homepage";
import { clearUsage, recordUsage } from "@/server/media/service";
import { hasPlaceholder } from "@/lib/cms/placeholders";
import { PAGE_TEMPLATE_KEYS } from "@/lib/cms/page-templates";
import { templateSections } from "./templates";
import { isLegalPageSlug } from "@/server/legal/links";
import { syncPublicPath } from "@/server/seo/redirects";
import {
  describeSection,
  placeholderRefusal,
  sectionsWithPlaceholders,
} from "./placeholders";
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
      error: "The page could not be created. Check the highlighted fields.",
      fieldErrors: {
        ...(flattened.title?.[0] ? { title: flattened.title[0] } : {}),
        ...(flattened.slug?.[0] ? { slug: flattened.slug[0] } : {}),
      },
    };
  }

  // The form only ever posts DRAFT, but the status is the request's to claim:
  // creating a page straight into publication is still publishing.
  if (parsed.data.status === "PUBLISHED") {
    await requirePermission("PAGES", "PUBLISH");
  }

  // Matched against the known templates; anything else starts blank.
  const requested = String(formData.get("template") ?? "blank");
  const template =
    PAGE_TEMPLATE_KEYS.find((key) => key === requested) ?? "blank";

  const clash = await prisma.page.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash) {
    return {
      error: "The page could not be created. Check the highlighted fields.",
      fieldErrors: { slug: "A page already uses that slug." },
    };
  }

  const sections = templateSections(template);

  const page = await prisma.page.create({
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      // A page made from a template has placeholders in it, so it starts as a
      // draft whatever the form asked for.
      status: sections.length > 0 ? "DRAFT" : parsed.data.status,
      publishedAt:
        sections.length === 0 && parsed.data.status === "PUBLISHED"
          ? new Date()
          : null,
      sections: {
        create: sections.map((row, index) => ({
          type: row.type as never,
          order: index,
          enabled: true,
          content: row.content as never,
          design: row.design as never,
        })),
      },
    },
    select: { id: true, slug: true },
  });

  if (sections.length === 0 && parsed.data.status === "PUBLISHED") {
    await syncPublicPath({ before: null, after: `/${page.slug}` });
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_CREATED",
    module: "PAGES",
    entityType: "Page",
    entityId: page.id,
    summary: `Created page /${page.slug}${template === "blank" ? "" : ` from the ${template} template`}`,
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

  // The homepage keeps its slug whatever the form says: it is what makes the
  // page the homepage, and "home" is reserved, so the ordinary schema would
  // refuse it anyway. Looked up before parsing so the rule comes from the
  // database rather than from a field the form could leave out.
  const current = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { slug: true },
  });
  const isHome = current ? isHomeSlug(current.slug) : false;

  const meta = pageSchema.pick({ title: true, status: true }).safeParse({
    title: formData.get("title"),
    status: formData.get("status"),
  });
  const slugResult = isHome
    ? null
    : pageSchema.shape.slug.safeParse(formData.get("slug"));

  if (!meta.success || (slugResult && !slugResult.success)) {
    const flattened = meta.success ? {} : meta.error.flatten().fieldErrors;
    const slugError =
      slugResult && !slugResult.success
        ? slugResult.error.issues[0]?.message
        : undefined;
    return {
      error: "The page could not be saved. Check the highlighted fields.",
      fieldErrors: {
        ...(flattened.title?.[0] ? { title: flattened.title[0] } : {}),
        ...(slugError ? { slug: slugError } : {}),
      },
    };
  }

  const data = meta.data;
  const slug = slugResult?.success ? slugResult.data : HOME_SLUG;

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!page) return { error: "That page no longer exists." };

  // Publishing is a separate permission from editing.
  if (data.status === "PUBLISHED" && page.status !== "PUBLISHED") {
    await requirePermission("PAGES", "PUBLISH");
  }

  // A live page never carries a template's unfinished instructions.
  if (data.status === "PUBLISHED") {
    const unfinished = await sectionsWithPlaceholders({ pageId: page.id });
    if (unfinished.length > 0) {
      return {
        error: placeholderRefusal(unfinished),
        fieldErrors: { status: "Finish the placeholders first." },
      };
    }
  }

  const clash = await prisma.page.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (clash && clash.id !== page.id) {
    return {
      error: "The page could not be saved. Check the highlighted fields.",
      fieldErrors: { slug: "A page already uses that slug." },
    };
  }

  await prisma.page.update({
    where: { id: page.id },
    data: {
      title: data.title,
      slug,
      status: data.status,
      // Re-publishing keeps the original date; unpublishing clears it, so the
      // column always means "published since", never "was published once".
      publishedAt:
        data.status === "PUBLISHED" ? (page.publishedAt ?? new Date()) : null,
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action:
      page.status !== data.status ? "PAGE_STATUS_CHANGED" : "PAGE_UPDATED",
    module: "PAGES",
    entityType: "Page",
    entityId: page.id,
    summary: `${data.title} (/${slug}) — ${data.status}`,
    metadata: {
      from: page.status,
      to: data.status,
      slug: slug,
    },
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${page.id}`);
  // A published page that changes address leaves a redirect behind. The
  // homepage's address never changes, and / is never redirected.
  if (!isHome) {
    await syncPublicPath({
      before: page.status === "PUBLISHED" ? `/${page.slug}` : null,
      after: data.status === "PUBLISHED" ? `/${slug}` : null,
      actorId: actor.id,
    });
  }

  revalidatePath(pagePublicPath(page.slug));
  revalidatePath(pagePublicPath(slug));
  // A policy page appearing or disappearing changes the footer and the
  // consent line on every page.
  if (
    (page.status !== data.status || page.slug !== slug) &&
    ((await isLegalPageSlug(page.slug)) || (await isLegalPageSlug(slug)))
  ) {
    revalidatePath("/", "layout");
  }

  return { success: "Page saved." };
}

/**
 * Creates the homepage as a draft, starting from what / already shows.
 *
 * Idempotent: a second press, or two editors pressing at once, opens the one
 * homepage rather than failing or making another. The draft changes nothing
 * public until somebody with the right to publish publishes it.
 */
export async function setUpHomepageAction(): Promise<void> {
  const actor = await requirePermission("PAGES", "CREATE");

  const existing = await homePageRecord();
  if (existing) {
    // Only reachable if a row was soft-deleted before deletion was refused.
    if (existing.deletedAt) {
      await prisma.page.update({
        where: { id: existing.id },
        data: { deletedAt: null, status: "DRAFT", publishedAt: null },
      });
    }
    redirect(`/admin/pages/${existing.id}`);
  }

  const starter = await starterHomeSections();

  let pageId: string;
  try {
    const page = await prisma.page.create({
      data: {
        title: "Homepage",
        slug: HOME_SLUG,
        status: "DRAFT",
        sections: {
          create: starter.map((row, index) => ({
            type: row.type as never,
            order: index,
            enabled: true,
            content: row.content as never,
            design: row.design as never,
          })),
        },
      },
      select: { id: true },
    });
    pageId = page.id;
  } catch {
    // Somebody else set it up in the same moment. Theirs is the homepage.
    const raced = await homePageRecord();
    if (!raced) throw new Error("The homepage could not be created.");
    redirect(`/admin/pages/${raced.id}`);
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_CREATED",
    module: "PAGES",
    entityType: "Page",
    entityId: pageId,
    summary: `Set up the homepage (${starter.length} starter sections)`,
  });

  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${pageId}`);
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

  // The homepage is unpublished, not deleted: a deleted one would leave its
  // reserved slug taken by a row nobody can see or restore.
  if (isHomeSlug(page.slug)) redirect(`/admin/pages/${page.id}?error=home`);

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
  if (await isLegalPageSlug(page.slug)) revalidatePath("/", "layout");
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

function revalidateOwner(owner: SectionOwner): void {
  revalidatePath(owner.adminPath);
  revalidatePath(owner.publicPath);
}

/** Reads which owner an add-section form is for. Only the two known kinds. */
function readOwnerRef(formData: FormData): OwnerRef | null {
  const pageId = String(formData.get("pageId") ?? "");
  const cityId = String(formData.get("cityId") ?? "");
  // Exactly one, the same rule the database enforces on the row itself.
  if (pageId && !cityId) return { kind: "page", id: pageId };
  if (cityId && !pageId) return { kind: "city", id: cityId };
  return null;
}

export async function addSectionAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  await requireStaff();

  const ref = readOwnerRef(formData);
  const parsed = addSectionSchema.safeParse({ type: formData.get("type") });
  if (!ref || !parsed.success) return { error: "Invalid request." };

  const owner = await resolveOwner(ref);
  if (!owner) return { error: "That page no longer exists." };
  const actor = await requirePermission(owner.module, "EDIT");

  const defaults = defaultsFor(parsed.data.type);
  if (!defaults) return { error: "That section type is not available." };

  const last = await prisma.pageSection.findFirst({
    where: siblingsOf(owner),
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const section = await prisma.pageSection.create({
    data: {
      ...siblingsOf(owner),
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
    module: owner.module,
    entityType: "PageSection",
    entityId: section.id,
    summary: `Added ${parsed.data.type} to ${owner.label}`,
  });

  revalidateOwner(owner);
  return { success: "Section added." };
}

export async function updateSectionAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  await requireStaff();

  const found = await sectionWithOwner(String(formData.get("sectionId") ?? ""));
  if (!found) return { error: "That section no longer exists." };
  const { section, owner } = found;
  // Decided by what the section belongs to in the database, not by anything
  // the form says about it.
  const actor = await requirePermission(owner.module, "EDIT");

  const definition = getSectionDefinition(section.type);
  const schema = contentSchemaFor(section.type);
  if (!definition || !schema)
    return { error: "That section type is not available." };

  // Content arrives as flat form fields. Repeaters and catalogue selections are
  // posted as JSON because neither a nested list nor an ordered one can be
  // expressed in form encoding without inventing a convention for it.
  const raw: Record<string, unknown> = {};
  for (const field of definition.fields) {
    if (field.kind === "repeater" || field.kind === "entities") {
      const json = String(formData.get(field.name) ?? "[]");
      try {
        const parsedJson: unknown = JSON.parse(json);
        raw[field.name] = Array.isArray(parsedJson) ? parsedJson : [];
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
    return {
      error: "The section could not be saved. Check the highlighted fields.",
      fieldErrors,
    };
  }

  const enabled = formData.get("enabled") === "on";

  // On a live page a placeholder would be published the moment it is saved.
  if (owner.published && enabled && hasPlaceholder(parsed.data)) {
    return {
      error: placeholderRefusal([describeSection(section.type, parsed.data)]),
    };
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
      enabled,
    },
  });

  // Track which media this section references so the library can warn before
  // one of these images is deleted.
  await recordMediaUsage(section.id, section.type, content);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PAGE_SECTION_UPDATED",
    module: owner.module,
    entityType: "PageSection",
    entityId: section.id,
    summary: `Updated ${section.type} on ${owner.label}`,
  });

  revalidateOwner(owner);
  return { success: "Section saved." };
}

export async function duplicateSectionAction(
  formData: FormData,
): Promise<void> {
  await requireStaff();

  const parsed = sectionIdSchema.safeParse({
    sectionId: formData.get("sectionId"),
  });
  if (!parsed.success) return;

  const found = await sectionWithOwner(parsed.data.sectionId);
  if (!found) return;
  const { section: source, owner } = found;
  const actor = await requirePermission(owner.module, "EDIT");

  // Everything after the original shifts down so the copy sits directly
  // beneath it rather than at the end of the page.
  const [, copy] = await prisma.$transaction([
    prisma.pageSection.updateMany({
      where: { ...siblingsOf(owner), order: { gt: source.order } },
      data: { order: { increment: 1 } },
    }),
    prisma.pageSection.create({
      data: {
        ...siblingsOf(owner),
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
    module: owner.module,
    entityType: "PageSection",
    entityId: parsed.data.sectionId,
    summary: `Duplicated ${source.type} on ${owner.label}`,
  });

  revalidateOwner(owner);
}

export async function moveSectionAction(formData: FormData): Promise<void> {
  await requireStaff();

  const parsed = moveSectionSchema.safeParse({
    sectionId: formData.get("sectionId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) return;

  const found = await sectionWithOwner(parsed.data.sectionId);
  if (!found) return;
  const { section, owner } = found;
  await requirePermission(owner.module, "EDIT");

  // Only ever swapped with a section of the same owner: moving past the last
  // section of one page must not reach into another.
  const neighbour = await prisma.pageSection.findFirst({
    where: {
      ...siblingsOf(owner),
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

  revalidateOwner(owner);
}

export async function deleteSectionAction(formData: FormData): Promise<void> {
  await requireStaff();

  const parsed = sectionIdSchema.safeParse({
    sectionId: formData.get("sectionId"),
  });
  if (!parsed.success) return;

  const found = await sectionWithOwner(parsed.data.sectionId);
  if (!found) return;
  const { section, owner } = found;
  const actor = await requirePermission(owner.module, "EDIT");

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
    module: owner.module,
    entityType: "PageSection",
    entityId: section.id,
    summary: `Removed ${section.type} from ${owner.label}`,
  });

  revalidateOwner(owner);
}
