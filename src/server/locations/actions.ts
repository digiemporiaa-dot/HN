"use server";

import { revalidatePath } from "next/cache";
import { syncPublicPath } from "@/server/seo/redirects";
import {
  placeholderRefusal,
  sectionsWithPlaceholders,
} from "@/server/cms/placeholders";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { clearUsage, recordUsage } from "@/server/media/service";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { readJsonArray } from "@/lib/validation/product-info";
import {
  cityIdSchema,
  cityLinksSchema,
  citySchema,
  newCitySchema,
  stateIdSchema,
  stateSchema,
} from "@/lib/validation/locations";
import { cityPath } from "./service";

export type LocationActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * A refused save must say so. A field error with no field on screen to sit
 * beside — a list cap, a value the form never offered — is otherwise dropped by
 * the shared banner, which only shows `error`, and a refusal nobody can see
 * looks exactly like a save that worked.
 */
function refused(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  const fieldErrors = fieldErrorsFrom(error);
  return {
    error: "Some of this could not be saved — see the highlighted fields.",
    fieldErrors,
  };
}

function revalidateLocations(): void {
  revalidatePath("/admin/locations");
  revalidatePath("/admin/locations/states/[id]", "page");
  revalidatePath("/admin/locations/cities/[id]", "page");
  // The public side too: the index lists every published city, and a state
  // renamed or a city unpublished changes pages other than the one edited.
  revalidatePath("/locations");
  revalidatePath("/(site)/locations/[slug]", "page");
}

/* ------------------------------------------------------------------ states -- */

function readState(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    code: formData.get("code") ?? "",
    kind: formData.get("kind"),
    active: formData.get("active") === "on",
  };
}

async function stateConflict(
  slug: string,
  code: string,
  exceptId?: string,
): Promise<Record<string, string> | null> {
  const [bySlug, byCode] = await Promise.all([
    prisma.state.findFirst({
      where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    }),
    code
      ? prisma.state.findFirst({
          where: { code, ...(exceptId ? { id: { not: exceptId } } : {}) },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  const errors: Record<string, string> = {};
  if (bySlug) errors.slug = "Another state already uses that slug.";
  if (byCode) errors.code = "Another state already uses that code.";
  return Object.keys(errors).length ? errors : null;
}

export async function createStateAction(
  _previous: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const actor = await requirePermission("LOCATIONS", "CREATE");

  const parsed = stateSchema.safeParse(readState(formData));
  if (!parsed.success) return refused(parsed.error);

  const conflict = await stateConflict(parsed.data.slug, parsed.data.code);
  if (conflict)
    return {
      error: "That clashes with an existing state.",
      fieldErrors: conflict,
    };

  const state = await prisma.state.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      code: parsed.data.code || null,
      kind: parsed.data.kind,
      active: parsed.data.active,
    },
    select: { id: true },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "STATE_CREATED",
    module: "LOCATIONS",
    entityType: "State",
    entityId: state.id,
    summary: parsed.data.name,
  });

  revalidateLocations();
  redirect(`/admin/locations/states/${state.id}`);
}

export async function updateStateAction(
  _previous: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const actor = await requirePermission("LOCATIONS", "EDIT");

  const id = String(formData.get("stateId") ?? "");
  const parsed = stateSchema.safeParse(readState(formData));
  if (!parsed.success) return refused(parsed.error);

  const existing = await prisma.state.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { error: "That state no longer exists." };

  const conflict = await stateConflict(parsed.data.slug, parsed.data.code, id);
  if (conflict)
    return {
      error: "That clashes with an existing state.",
      fieldErrors: conflict,
    };

  await prisma.state.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      code: parsed.data.code || null,
      kind: parsed.data.kind,
      active: parsed.data.active,
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "STATE_UPDATED",
    module: "LOCATIONS",
    entityType: "State",
    entityId: id,
    summary: parsed.data.name,
  });

  revalidateLocations();
  return { success: "State saved." };
}

export async function deleteStateAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("LOCATIONS", "DELETE");

  const parsed = stateIdSchema.safeParse({ stateId: formData.get("stateId") });
  if (!parsed.success) redirect("/admin/locations");

  const state = await prisma.state.findUnique({
    where: { id: parsed.data.stateId },
    select: {
      id: true,
      name: true,
      // Soft-deleted cities count too: they still hold the foreign key, and a
      // state cannot be removed from under a city that may yet be restored.
      _count: { select: { cities: true } },
    },
  });
  if (!state) redirect("/admin/locations");

  if (state._count.cities > 0) {
    redirect(`/admin/locations/states/${state.id}?error=has-cities`);
  }

  await prisma.state.delete({ where: { id: state.id } });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "STATE_DELETED",
    module: "LOCATIONS",
    entityType: "State",
    entityId: state.id,
    summary: state.name,
  });

  revalidateLocations();
  redirect("/admin/locations");
}

/* ------------------------------------------------------------------ cities -- */

async function citySlugTaken(slug: string, exceptId?: string) {
  const row = await prisma.city.findFirst({
    // Deleted cities included: their URL may be restored, and handing it to a
    // different city in the meantime would make the restore collide.
    where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true, state: { select: { name: true } } },
  });
  return row;
}

export async function createCityAction(
  _previous: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const actor = await requirePermission("LOCATIONS", "CREATE");

  const parsed = newCitySchema.safeParse({
    stateId: formData.get("stateId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return refused(parsed.error);

  const state = await prisma.state.findFirst({
    where: { id: parsed.data.stateId, active: true },
    select: { id: true, name: true },
  });
  if (!state) {
    return {
      error: "Choose a state from the list.",
      fieldErrors: { stateId: "Choose a state from the list" },
    };
  }

  const taken = await citySlugTaken(parsed.data.slug);
  if (taken) {
    return {
      error: "That slug is already in use.",
      fieldErrors: {
        slug: `Already used by a city in ${taken.state.name}. Add the state to tell them apart, e.g. ${parsed.data.slug}-${state.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.`,
      },
    };
  }

  // A new city is always a draft. What makes a city page worth publishing is
  // written on the next screen, and publishing one with nothing on it is the
  // thin page this whole module exists to avoid.
  const city = await prisma.city.create({
    data: {
      stateId: state.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      status: "DRAFT",
    },
    select: { id: true },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CITY_CREATED",
    module: "LOCATIONS",
    entityType: "City",
    entityId: city.id,
    summary: `${parsed.data.name}, ${state.name}`,
  });

  revalidateLocations();
  redirect(`/admin/locations/cities/${city.id}`);
}

export async function updateCityAction(
  _previous: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const actor = await requirePermission("LOCATIONS", "EDIT");

  const id = String(formData.get("cityId") ?? "");
  const parsed = citySchema.safeParse({
    stateId: formData.get("stateId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    headline: formData.get("headline") ?? "",
    heroImageId: formData.get("heroImageId") ?? "",
    intro: formData.get("intro") ?? "",
    content: formData.get("content") ?? "",
    coverage: formData.get("coverage") ?? "",
    ctaHeading: formData.get("ctaHeading") ?? "",
    ctaBody: formData.get("ctaBody") ?? "",
    ctaLabel: formData.get("ctaLabel") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    indexable: formData.get("indexable") === "on",
    status: formData.get("status"),
  });
  if (!parsed.success) return refused(parsed.error);

  const city = await prisma.city.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      stateId: true,
      status: true,
      indexable: true,
      publishedAt: true,
      heroImageId: true,
    },
  });
  if (!city) return { error: "That city no longer exists." };

  // Publishing and search indexation are publishing decisions: what the public
  // and search engines see. They take their own permission, whichever way the
  // switch is thrown.
  const publishing =
    (parsed.data.status === "PUBLISHED") !== (city.status === "PUBLISHED");
  if (publishing || parsed.data.indexable !== city.indexable) {
    await requirePermission("LOCATIONS", "PUBLISH");
  }

  // The same rule as pages: nothing bracketed as unfinished goes live.
  if (parsed.data.status === "PUBLISHED") {
    const unfinished = await sectionsWithPlaceholders({ cityId: city.id });
    if (unfinished.length > 0) {
      return {
        error: placeholderRefusal(unfinished),
        fieldErrors: { status: "Finish the placeholders first." },
      };
    }
  }

  if (parsed.data.stateId !== city.stateId) {
    const state = await prisma.state.findFirst({
      where: { id: parsed.data.stateId, active: true },
      select: { id: true },
    });
    if (!state) {
      return {
        error: "Choose a state from the list.",
        fieldErrors: { stateId: "Choose a state from the list" },
      };
    }
  }

  if (parsed.data.slug !== city.slug) {
    const taken = await citySlugTaken(parsed.data.slug, city.id);
    if (taken) {
      return {
        error: "That slug is already in use.",
        fieldErrors: { slug: `Already used by a city in ${taken.state.name}.` },
      };
    }
  }

  const heroImageId = parsed.data.heroImageId || null;
  if (heroImageId) {
    const asset = await prisma.mediaAsset.findFirst({
      where: {
        id: heroImageId,
        deletedAt: null,
        kind: { in: ["IMAGE", "VECTOR"] },
      },
      select: { id: true },
    });
    if (!asset) {
      return {
        error: "That image is no longer in the library.",
        fieldErrors: { heroImageId: "Choose an image from the library" },
      };
    }
  }

  await prisma.city.update({
    where: { id: city.id },
    data: {
      stateId: parsed.data.stateId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      headline: parsed.data.headline || null,
      heroImageId,
      intro: parsed.data.intro || null,
      content: parsed.data.content || null,
      coverage: parsed.data.coverage || null,
      ctaHeading: parsed.data.ctaHeading || null,
      ctaBody: parsed.data.ctaBody || null,
      ctaLabel: parsed.data.ctaLabel || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      indexable: parsed.data.indexable,
      status: parsed.data.status,
      // Stamped the first time it goes live and left alone after.
      publishedAt:
        parsed.data.status === "PUBLISHED"
          ? (city.publishedAt ?? new Date())
          : city.publishedAt,
    },
  });

  // The library warns before deleting an image still in use, so it has to know.
  if (heroImageId !== city.heroImageId) {
    await clearUsage({
      entityType: "City",
      entityId: city.id,
      field: "heroImage",
    });
    if (heroImageId) {
      await recordUsage({
        assetId: heroImageId,
        entityType: "City",
        entityId: city.id,
        field: "heroImage",
      });
    }
  }

  // A published city page that changes address leaves a redirect behind.
  await syncPublicPath({
    before: city.status === "PUBLISHED" ? cityPath(city.slug) : null,
    after:
      parsed.data.status === "PUBLISHED" ? cityPath(parsed.data.slug) : null,
    actorId: actor.id,
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CITY_UPDATED",
    module: "LOCATIONS",
    entityType: "City",
    entityId: city.id,
    summary: parsed.data.name,
    metadata: {
      status: parsed.data.status,
      indexable: parsed.data.indexable,
      ...(parsed.data.slug !== city.slug
        ? { slugFrom: city.slug, slugTo: parsed.data.slug }
        : {}),
    },
  });

  revalidateLocations();
  revalidatePath(cityPath(city.slug));
  if (parsed.data.slug !== city.slug)
    revalidatePath(cityPath(parsed.data.slug));
  return { success: "City saved." };
}

/**
 * What a city page features, in the order it shows them.
 *
 * Drafts may be chosen — building a city page around a range that is not live
 * yet is normal — and the public page filters to what is published. Ids are
 * checked against what exists rather than trusted, and duplicates are dropped
 * keeping the first, so the order an editor arranged is the order stored.
 */
export async function saveCityLinksAction(
  _previous: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const actor = await requirePermission("LOCATIONS", "EDIT");

  const unique = (values: unknown[]) => [
    ...new Set(
      values
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  const parsed = cityLinksSchema.safeParse({
    cityId: formData.get("cityId"),
    categoryIds: unique(readJsonArray(formData.get("categoryIds"))),
    productIds: unique(readJsonArray(formData.get("productIds"))),
    specialtyIds: unique(readJsonArray(formData.get("specialtyIds"))),
  });
  if (!parsed.success) return refused(parsed.error);

  const city = await prisma.city.findFirst({
    where: { id: parsed.data.cityId, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!city) return { error: "That city no longer exists." };

  const [categories, products, specialties] = await Promise.all([
    prisma.category.findMany({
      where: { id: { in: parsed.data.categoryIds }, deletedAt: null },
      select: { id: true },
    }),
    prisma.product.findMany({
      where: { id: { in: parsed.data.productIds }, deletedAt: null },
      select: { id: true },
    }),
    prisma.specialty.findMany({
      where: { id: { in: parsed.data.specialtyIds } },
      select: { id: true },
    }),
  ]);

  const keep = (ids: string[], found: Array<{ id: string }>) => {
    const real = new Set(found.map((row) => row.id));
    return ids.filter((id) => real.has(id));
  };
  const categoryIds = keep(parsed.data.categoryIds, categories);
  const productIds = keep(parsed.data.productIds, products);
  const specialtyIds = keep(parsed.data.specialtyIds, specialties);

  await prisma.$transaction([
    prisma.cityCategory.deleteMany({ where: { cityId: city.id } }),
    prisma.cityProduct.deleteMany({ where: { cityId: city.id } }),
    prisma.citySpecialty.deleteMany({ where: { cityId: city.id } }),
    prisma.cityCategory.createMany({
      data: categoryIds.map((categoryId, order) => ({
        cityId: city.id,
        categoryId,
        order,
      })),
    }),
    prisma.cityProduct.createMany({
      data: productIds.map((productId, order) => ({
        cityId: city.id,
        productId,
        order,
      })),
    }),
    prisma.citySpecialty.createMany({
      data: specialtyIds.map((specialtyId, order) => ({
        cityId: city.id,
        specialtyId,
        order,
      })),
    }),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CITY_LINKS_UPDATED",
    module: "LOCATIONS",
    entityType: "City",
    entityId: city.id,
    summary: `Featured items for ${city.name}`,
    metadata: {
      categories: categoryIds.length,
      products: productIds.length,
      specialties: specialtyIds.length,
    },
  });

  revalidateLocations();
  revalidatePath(cityPath(city.slug));
  return { success: "Featured items saved." };
}

export async function deleteCityAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("LOCATIONS", "DELETE");

  const parsed = cityIdSchema.safeParse({ cityId: formData.get("cityId") });
  if (!parsed.success) redirect("/admin/locations");

  const city = await prisma.city.findFirst({
    where: { id: parsed.data.cityId, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!city) redirect("/admin/locations");

  // Soft deleted, and taken off the public site in the same write: a city page
  // carries a URL and inbound links, and deleting one by mistake should be
  // recoverable rather than a 404 somebody has to explain.
  await prisma.city.update({
    where: { id: city.id },
    data: { deletedAt: new Date(), status: "ARCHIVED", indexable: false },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CITY_DELETED",
    module: "LOCATIONS",
    entityType: "City",
    entityId: city.id,
    summary: city.name,
  });

  revalidateLocations();
  revalidatePath(cityPath(city.slug));
  redirect("/admin/locations");
}

export async function restoreCityAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("LOCATIONS", "EDIT");

  const parsed = cityIdSchema.safeParse({ cityId: formData.get("cityId") });
  if (!parsed.success) redirect("/admin/locations");

  const city = await prisma.city.findFirst({
    where: { id: parsed.data.cityId, deletedAt: { not: null } },
    select: { id: true, name: true },
  });
  if (!city) redirect("/admin/locations");

  // Back as a draft, not indexed: a page that was taken down is looked at again
  // before it goes back up, not restored straight onto the public site.
  await prisma.city.update({
    where: { id: city.id },
    data: { deletedAt: null, status: "DRAFT", indexable: false },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CITY_RESTORED",
    module: "LOCATIONS",
    entityType: "City",
    entityId: city.id,
    summary: city.name,
  });

  revalidateLocations();
  redirect(`/admin/locations/cities/${city.id}`);
}
