"use server";

import { prisma } from "@/server/db";
import { currentPermissions } from "@/server/permissions";
import {
  normaliseQuery,
  SEARCH_MIN_QUERY,
  SEARCH_PER_TYPE,
  sortHits,
  type SearchHit,
} from "@/lib/admin/search";

const status = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

/**
 * The admin's record search.
 *
 * Every group is queried only when the signed-in member of staff may view
 * that module — checked here, on the server, from their effective
 * permissions (role plus overrides). Nothing about a forbidden group leaves
 * this function, not even a count. Each query selects only what the result
 * row shows.
 */
export async function adminSearch(query: string): Promise<SearchHit[]> {
  const { can } = await currentPermissions();
  const q = normaliseQuery(query);
  if (q.length < SEARCH_MIN_QUERY) return [];

  const contains = { contains: q, mode: "insensitive" as const };
  const take = SEARCH_PER_TYPE;
  const hits: SearchHit[] = [];
  const tasks: Array<Promise<unknown>> = [];

  const leadSearch = (source: "RFQ" | "OTHER") =>
    prisma.lead.findMany({
      where: {
        deletedAt: null,
        ...(source === "RFQ" ? { source: "RFQ" as const } : { source: { not: "RFQ" as const } }),
        OR: [{ name: contains }, { email: contains }, { organisation: contains }, { phone: contains }, { reference: contains }],
      },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, name: true, reference: true, organisation: true, status: true },
    });

  if (can("LEADS", "VIEW")) {
    tasks.push(
      leadSearch("OTHER").then((rows) =>
        rows.forEach((row) =>
          hits.push({
            id: row.id,
            type: "Lead",
            title: row.name,
            subtitle: [row.reference, row.organisation, status(row.status)].filter(Boolean).join(" · "),
            href: `/admin/leads/${row.id}`,
          }),
        ),
      ),
    );
  }
  if (can("RFQ", "VIEW")) {
    tasks.push(
      leadSearch("RFQ").then((rows) =>
        rows.forEach((row) =>
          hits.push({
            id: row.id,
            type: "RFQ",
            title: row.name,
            subtitle: [row.reference, row.organisation, status(row.status)].filter(Boolean).join(" · "),
            href: `/admin/rfqs/${row.id}`,
          }),
        ),
      ),
    );
  }
  if (can("PRODUCTS", "VIEW")) {
    tasks.push(
      prisma.product
        .findMany({
          where: { deletedAt: null, OR: [{ name: contains }, { slug: contains }, { modelNumber: contains }] },
          orderBy: { name: "asc" },
          take,
          select: { id: true, name: true, modelNumber: true, status: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({
              id: row.id,
              type: "Product",
              title: row.name,
              subtitle: [row.modelNumber, status(row.status)].filter(Boolean).join(" · "),
              href: `/admin/products/${row.id}`,
            }),
          ),
        ),
    );
  }
  if (can("CATEGORIES", "VIEW")) {
    tasks.push(
      prisma.category
        .findMany({
          where: { deletedAt: null, OR: [{ name: contains }, { slug: contains }] },
          orderBy: [{ depth: "asc" }, { name: "asc" }],
          take,
          select: { id: true, name: true, depth: true, status: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({
              id: row.id,
              type: "Category",
              title: row.name,
              subtitle: [row.depth > 0 ? "Subcategory" : "Category", status(row.status)].join(" · "),
              href: `/admin/categories/${row.id}`,
            }),
          ),
        ),
    );
  }

  const taxonomy = [
    ["BRANDS", "Brand", "brand", "brands"],
    ["SPECIALTIES", "Specialty", "specialty", "specialties"],
    ["SOLUTIONS", "Solution", "solution", "solutions"],
  ] as const;
  for (const [module, type, model, path] of taxonomy) {
    if (!can(module, "VIEW")) continue;
    const delegate = prisma[model] as unknown as {
      findMany: (args: unknown) => Promise<Array<{ id: string; name: string; slug: string; status: string }>>;
    };
    tasks.push(
      delegate
        .findMany({
          where: { OR: [{ name: contains }, { slug: contains }] },
          orderBy: { name: "asc" },
          take,
          select: { id: true, name: true, slug: true, status: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({
              id: row.id,
              type,
              title: row.name,
              subtitle: `/${path}/${row.slug} · ${status(row.status)}`,
              href: `/admin/${path}/${row.id}`,
            }),
          ),
        ),
    );
  }

  if (can("APPLICATIONS", "VIEW")) {
    tasks.push(
      prisma.application
        .findMany({
          where: { OR: [{ name: contains }, { slug: contains }] },
          orderBy: { name: "asc" },
          take,
          select: { id: true, name: true, slug: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({ id: row.id, type: "Application", title: row.name, subtitle: row.slug, href: `/admin/applications/${row.id}` }),
          ),
        ),
    );
  }
  if (can("PAGES", "VIEW")) {
    tasks.push(
      prisma.page
        .findMany({
          where: { deletedAt: null, OR: [{ title: contains }, { slug: contains }] },
          orderBy: { title: "asc" },
          take,
          select: { id: true, title: true, slug: true, status: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({
              id: row.id,
              type: "Page",
              title: row.title,
              subtitle: `/${row.slug} · ${status(row.status)}`,
              href: `/admin/pages/${row.id}`,
            }),
          ),
        ),
    );
  }
  if (can("BLOGS", "VIEW")) {
    tasks.push(
      prisma.blogPost
        .findMany({
          where: { deletedAt: null, OR: [{ title: contains }, { slug: contains }] },
          orderBy: { updatedAt: "desc" },
          take,
          select: { id: true, title: true, status: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({ id: row.id, type: "Post", title: row.title, subtitle: status(row.status), href: `/admin/blogs/${row.id}` }),
          ),
        ),
    );
  }
  if (can("LOCATIONS", "VIEW")) {
    tasks.push(
      prisma.city
        .findMany({
          where: { deletedAt: null, OR: [{ name: contains }, { slug: contains }] },
          orderBy: { name: "asc" },
          take,
          select: { id: true, name: true, slug: true, status: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({
              id: row.id,
              type: "City",
              title: row.name,
              subtitle: `/locations/${row.slug} · ${status(row.status)}`,
              href: `/admin/locations/cities/${row.id}`,
            }),
          ),
        ),
    );
  }
  if (can("FORMS", "VIEW")) {
    tasks.push(
      prisma.form
        .findMany({
          where: { deletedAt: null, OR: [{ name: contains }, { key: contains }] },
          orderBy: { name: "asc" },
          take,
          select: { id: true, name: true, key: true, status: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({ id: row.id, type: "Form", title: row.name, subtitle: `${row.key} · ${status(row.status)}`, href: `/admin/forms/${row.id}` }),
          ),
        ),
    );
  }
  if (can("POPUPS", "VIEW")) {
    tasks.push(
      prisma.popup
        .findMany({
          where: { deletedAt: null, OR: [{ name: contains }, { heading: contains }] },
          orderBy: { updatedAt: "desc" },
          take,
          select: { id: true, name: true, active: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({ id: row.id, type: "Popup", title: row.name, subtitle: row.active ? "Active" : "Inactive", href: `/admin/popups/${row.id}` }),
          ),
        ),
    );
  }
  if (can("MEDIA", "VIEW")) {
    tasks.push(
      prisma.mediaAsset
        .findMany({
          where: { deletedAt: null, OR: [{ originalName: contains }, { title: contains }, { altText: contains }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, originalName: true, title: true, mimeType: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({
              id: row.id,
              type: "Media",
              title: row.title || row.originalName,
              subtitle: row.mimeType,
              href: `/admin/media?q=${encodeURIComponent(row.title || row.originalName)}`,
            }),
          ),
        ),
    );
  }
  if (can("STAFF", "VIEW")) {
    tasks.push(
      prisma.staff
        .findMany({
          where: { OR: [{ name: contains }, { email: contains }] },
          orderBy: { name: "asc" },
          take,
          select: { id: true, name: true, email: true },
        })
        .then((rows) =>
          rows.forEach((row) =>
            hits.push({ id: row.id, type: "Staff", title: row.name, subtitle: row.email, href: `/admin/staff/${row.id}` }),
          ),
        ),
    );
  }

  await Promise.all(tasks);
  return sortHits(hits);
}
