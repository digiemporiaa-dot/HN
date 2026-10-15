import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import type { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/server/db";
import { recordAuditEvent } from "../src/server/audit/log";
import { HN_CATALOGUE, type CatalogueProduct } from "./catalogue/hn-catalogue";
import { storeFile, webpSize } from "./lib/media";

/**
 * Loads the HN Medical System catalogue and takes every other product off the
 * site.
 *
 *   node ops/seed-catalogue.mjs --dry-run   # show what would change
 *   node ops/seed-catalogue.mjs             # do it
 *
 * (In development: npm run db:seed:catalogue [-- --dry-run].)
 *
 * What it does:
 *   - adds the catalogue's categories, subcategories and products, published,
 *     with their pictures (public/images/hn/catalogue, copied into the media
 *     library), highlights and code-by-code specifications. A category or
 *     product that already exists under the same address is left exactly as it
 *     is, so running it again adds nothing and never overwrites an edit;
 *   - moves every product that is not in the catalogue to the bin (the same
 *     soft delete as Products → Delete, so each can still be restored from the
 *     admin), and then any category left with nothing live in it;
 *   - points homepage sections that featured a removed product or category at
 *     catalogue ones instead, so no card links to a page that has gone.
 *
 * Nothing runs automatically. After running it, restart the application so
 * cached pages are rebuilt.
 */

const DRY_RUN = process.argv.includes("--dry-run");
const IMAGES = path.resolve(process.cwd(), "public/images/hn/catalogue");
/** The demo seeder's homepage object, swapped for a catalogue picture. */
const DEMO_HERO_IMAGE = "demo-hero-ct-scanner.webp";
const HERO_IMAGE = "polymer-clip-applicator";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** A catalogue picture, as a media library asset (stored once, then reused). */
async function image(key: string, alt: string): Promise<string> {
  const bytes = await fs.readFile(path.join(IMAGES, `${key}.webp`));
  const [width, height] = webpSize(bytes) ?? [1400, 1400];
  return storeFile({
    originalName: `hn-catalogue-${key}.webp`,
    bytes,
    folder: "products",
    extension: "webp",
    mimeType: "image/webp",
    kind: "IMAGE",
    title: alt,
    altText: alt,
    width,
    height,
  });
}

const live = () => ({ status: "PUBLISHED" as const, publishedAt: new Date() });

/* ------------------------------------------------------------------ add -- */

type Added = { categories: number; products: number; kept: string[]; skipped: string[] };

async function createProduct(product: CatalogueProduct, categoryId: string, order: number): Promise<string> {
  const row = await prisma.product.create({
    data: {
      slug: slugify(product.name),
      name: product.name,
      modelNumber: product.model ?? null,
      shortDescription: product.short,
      description: product.body,
      categoryId,
      primaryImageId: await image(product.image, product.name),
      featured: product.featured ?? false,
      order,
      ...live(),
    },
    select: { id: true },
  });

  for (const [index, key] of (product.gallery ?? []).entries()) {
    await prisma.productImage.create({
      data: { productId: row.id, mediaId: await image(key, `${product.name} — view ${index + 2}`), order: index },
    });
  }

  await prisma.productPoint.createMany({
    data: product.highlights.map((title, index) => ({
      productId: row.id,
      kind: "HIGHLIGHT" as const,
      title,
      order: index,
    })),
  });

  for (const [groupOrder, group] of product.specs.entries()) {
    await prisma.productSpecGroup.create({
      data: {
        productId: row.id,
        label: group.label,
        order: groupOrder,
        items: {
          create: group.items.map(([label, value, unit], itemOrder) => ({
            label,
            value,
            unit: unit ?? null,
            order: itemOrder,
          })),
        },
      },
    });
  }
  return row.id;
}

async function add(): Promise<Added> {
  const result: Added = { categories: 0, products: 0, kept: [], skipped: [] };

  for (const [order, category] of HN_CATALOGUE.entries()) {
    const parentSlug = slugify(category.name);
    let parent = await prisma.category.findFirst({
      where: { slug: parentSlug, parentId: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, deletedAt: true },
    });
    if (parent?.deletedAt) {
      // Someone deleted it on purpose; restoring it is their call.
      result.skipped.push(`category "${category.name}" (in the bin)`);
      continue;
    }
    if (!parent) {
      if (DRY_RUN) {
        result.categories += 1 + category.subs.length;
        result.products += category.subs.reduce((sum, sub) => sum + sub.products.length, 0);
        continue;
      }
      parent = await prisma.category.create({
        data: {
          slug: parentSlug,
          name: category.name,
          shortDescription: category.short,
          description: category.description,
          procurementInfo: category.procurement,
          imageId: await image(category.image, category.name),
          depth: 0,
          order,
          featured: category.featured ?? false,
          ...live(),
        },
        select: { id: true, deletedAt: true },
      });
      result.categories++;
    }

    for (const [subOrder, sub] of category.subs.entries()) {
      const subSlug = slugify(sub.name);
      let child = await prisma.category.findFirst({
        where: { slug: subSlug, parentId: parent.id },
        select: { id: true, deletedAt: true },
      });
      if (child?.deletedAt) {
        result.skipped.push(`category "${sub.name}" (in the bin)`);
        continue;
      }
      if (!child) {
        if (DRY_RUN) {
          result.categories++;
          result.products += sub.products.length;
          continue;
        }
        child = await prisma.category.create({
          data: {
            slug: subSlug,
            name: sub.name,
            shortDescription: sub.short,
            imageId: await image(sub.products[0].image, sub.name),
            parentId: parent.id,
            depth: 1,
            order: subOrder,
            ...live(),
          },
          select: { id: true, deletedAt: true },
        });
        result.categories++;
      }

      const created: string[] = [];
      for (const [productOrder, product] of sub.products.entries()) {
        const existing = await prisma.product.findUnique({
          where: { slug: slugify(product.name) },
          select: { id: true, deletedAt: true },
        });
        if (existing) {
          (existing.deletedAt ? result.skipped : result.kept).push(product.name);
          continue;
        }
        if (DRY_RUN) {
          result.products++;
          continue;
        }
        created.push(await createProduct(product, child.id, productOrder));
        result.products++;
      }

      // Related products: the others in the same subcategory.
      for (const productId of created) {
        const related = created.filter((id) => id !== productId).slice(0, 4);
        await prisma.productRelated.createMany({
          data: related.map((relatedId, relatedOrder) => ({ productId, relatedId, order: relatedOrder })),
          skipDuplicates: true,
        });
      }
    }
  }
  return result;
}

/* --------------------------------------------------------------- remove -- */

const catalogueSlugs = new Set(
  HN_CATALOGUE.flatMap((category) => category.subs.flatMap((sub) => sub.products.map((product) => slugify(product.name)))),
);

async function catalogueCategoryIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const category of HN_CATALOGUE) {
    const parent = await prisma.category.findFirst({
      where: { slug: slugify(category.name), parentId: null, deletedAt: null },
      select: { id: true },
    });
    if (!parent) continue;
    ids.add(parent.id);
    const children = await prisma.category.findMany({
      where: { parentId: parent.id, slug: { in: category.subs.map((sub) => slugify(sub.name)) }, deletedAt: null },
      select: { id: true },
    });
    for (const child of children) ids.add(child.id);
  }
  return ids;
}

type Removed = { products: Array<{ id: string; name: string; slug: string }>; categories: Array<{ id: string; name: string }> };

async function remove(): Promise<Removed> {
  const now = new Date();
  const products = await prisma.product.findMany({
    where: { deletedAt: null, slug: { notIn: [...catalogueSlugs] } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  if (!DRY_RUN && products.length) {
    // The same soft delete as the admin's Delete: archived, restorable.
    await prisma.product.updateMany({
      where: { id: { in: products.map((product) => product.id) } },
      data: { deletedAt: now, status: "ARCHIVED" },
    });
    for (const product of products) {
      await recordAuditEvent({
        action: "PRODUCT_DELETED",
        module: "PRODUCTS",
        entityType: "Product",
        entityId: product.id,
        summary: `Deleted ${product.name} (/${product.slug}): not in the HN Medical System catalogue`,
        metadata: { source: "seed-catalogue" },
      });
    }
  }

  // Categories outside the catalogue that are left with nothing live in them,
  // subcategories before their parents. In a dry run the products above are
  // still live, so count them as gone.
  const keep = await catalogueCategoryIds();
  const gone = new Set(products.map((product) => product.id));
  const categories: Removed["categories"] = [];
  const goneCategories = new Set<string>();
  for (const depth of [1, 0]) {
    const rows = await prisma.category.findMany({
      where: { deletedAt: null, depth },
      select: {
        id: true,
        name: true,
        slug: true,
        products: { where: { deletedAt: null }, select: { id: true } },
        children: { where: { deletedAt: null }, select: { id: true } },
      },
    });
    for (const row of rows) {
      if (keep.has(row.id)) continue;
      const liveProducts = row.products.filter((product) => !gone.has(product.id));
      const liveChildren = row.children.filter((child) => !goneCategories.has(child.id));
      if (liveProducts.length || liveChildren.length) continue;
      goneCategories.add(row.id);
      categories.push({ id: row.id, name: row.name });
      if (DRY_RUN) continue;
      await prisma.category.update({ where: { id: row.id }, data: { deletedAt: now, status: "ARCHIVED" } });
      await recordAuditEvent({
        action: "CATEGORY_DELETED",
        module: "CATEGORIES",
        entityType: "Category",
        entityId: row.id,
        summary: `Deleted ${row.name} (/${row.slug}): no products left after loading the HN Medical System catalogue`,
        metadata: { source: "seed-catalogue" },
      });
    }
  }
  return { products, categories };
}

/* ---------------------------------------------------------------- pages -- */

/**
 * Page sections refer to products and categories by id, and the homepage hero
 * carries product cards with links. Anything pointing at a removed record is
 * pointed at the catalogue instead.
 */
async function repointPages(removed: Removed): Promise<number> {
  const removedProducts = new Set(removed.products.map((product) => product.id));
  const removedCategories = new Set(removed.categories.map((category) => category.id));
  const removedPaths = new Set(removed.products.map((product) => `/products/${product.slug}`));

  const featured = await prisma.product.findMany({
    where: { slug: { in: [...catalogueSlugs] }, deletedAt: null, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, slug: true, shortDescription: true, primaryImageId: true },
  });
  const topCategories = await prisma.category.findMany({
    where: { slug: { in: HN_CATALOGUE.map((category) => slugify(category.name)) }, parentId: null, deletedAt: null },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  const productCount = await prisma.product.count({ where: { deletedAt: null, status: "PUBLISHED" } });
  const heroAsset = await prisma.mediaAsset.findFirst({
    where: { originalName: DEMO_HERO_IMAGE, deletedAt: null },
    select: { id: true },
  });

  const sections = await prisma.pageSection.findMany({
    where: { pageId: { not: null } },
    select: { id: true, type: true, content: true },
  });

  let changed = 0;
  for (const section of sections) {
    const content = { ...(section.content as Record<string, unknown>) };
    let dirty = false;

    if (Array.isArray(content.items) && content.items.every((item) => typeof item === "string")) {
      const items = content.items as string[];
      if (items.some((id) => removedProducts.has(id) || removedCategories.has(id))) {
        const products = featured.map((product) => product.id).filter((id) => !items.includes(id));
        const categories = topCategories.map((category) => category.id).filter((id) => !items.includes(id));
        content.items = items
          .map((id) => (removedProducts.has(id) ? products.shift() : removedCategories.has(id) ? categories.shift() : id))
          .filter((id): id is string => Boolean(id));
        dirty = true;
      }
    }

    if (section.type === "HERO") {
      const points = Array.isArray(content.points) ? (content.points as Array<Record<string, unknown>>) : [];
      if (points.some((point) => typeof point.href === "string" && removedPaths.has(point.href))) {
        content.points = featured
          .filter((product) => product.primaryImageId)
          .slice(0, 3)
          .map((product) => ({
            title: product.name,
            detail: product.shortDescription?.split(/[.,:]/)[0]?.slice(0, 80) ?? "",
            image: product.primaryImageId ?? "",
            href: `/products/${product.slug}`,
          }));
        dirty = true;
      }
      if (heroAsset && content.image === heroAsset.id && !DRY_RUN) {
        content.image = await image(HERO_IMAGE, "Polymer clip applicators, gold, purple and green");
        dirty = true;
      }
      if (content.statLabel === "Products in the catalogue" && content.statValue !== String(productCount)) {
        content.statValue = String(productCount);
        dirty = true;
      }
    }

    if (!dirty) continue;
    changed++;
    if (!DRY_RUN) await prisma.pageSection.update({ where: { id: section.id }, data: { content: json(content) } });
  }
  return changed;
}

/* ------------------------------------------------------------------ run -- */

async function run(): Promise<void> {
  if (DRY_RUN) console.log("Dry run: nothing will be changed.\n");

  const added = await add();
  const removed = await remove();
  const pages = await repointPages(removed);

  const verb = DRY_RUN ? "Would add" : "Added";
  console.log(`${verb} ${added.categories} categories and ${added.products} products from the HN Medical System catalogue.`);
  if (added.kept.length) console.log(`Already there, left unchanged: ${added.kept.length} products.`);
  if (added.skipped.length) console.log(`Skipped because they are in the bin: ${added.skipped.join(", ")}.`);
  console.log(
    `${DRY_RUN ? "Would move" : "Moved"} ${removed.products.length} other products and ${removed.categories.length} empty categories to the bin` +
      (removed.products.length ? ":" : "."),
  );
  for (const product of removed.products) console.log(`  - ${product.name}`);
  console.log(`${DRY_RUN ? "Would update" : "Updated"} ${pages} page sections that pointed at them.`);
  if (!DRY_RUN) {
    console.log("Removed products can be restored from Products in the admin (as drafts).");
    console.log("Restart the application so cached pages are rebuilt.");
  }
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
