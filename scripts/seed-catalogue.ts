import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import type { Prisma } from "../src/generated/prisma/client";
import { DEFAULT_SECTION_DESIGN } from "../src/lib/design/section-options";
import { prisma } from "../src/server/db";
import { recordAuditEvent } from "../src/server/audit/log";
import { SETTINGS_BY_KEY } from "../src/server/settings/registry";
import { HN_CATALOGUE, type CatalogueProduct } from "./catalogue/hn-catalogue";
import {
  ABOUT_IMAGES,
  COMPANY_SETTINGS,
  DEMO_HEADER_ITEMS,
  DEMO_SETTING_VALUES,
  HEADER_ITEMS,
  HOME_IMAGES,
  HOME_PRODUCTS,
  hnAboutSections,
  hnHomeSections,
} from "./catalogue/hn-homepage";
import { HN_SOLUTIONS, HN_SPECIALTIES, type TaxonomyEntry } from "./catalogue/hn-taxonomy";
import { SUPPORT_IMAGE, hnPrivacySections, hnSupportSections, hnTermsSections } from "./catalogue/hn-pages";
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
 *   - points page sections that featured a removed product or category at
 *     catalogue ones instead, so no card links to a page that has gone;
 *   - publishes the HN Medical System homepage, About, Support, Privacy and
 *     Terms pages (scripts/catalogue/hn-homepage.ts, hn-pages.ts). The page
 *     each replaces is kept as a draft, "<slug>-previous-…", in Pages. It does this
 *     once per page: after that the page is the editors', and running the
 *     script again leaves it alone;
 *   - sets the header menu to Home, Products, About and Contact, if it is
 *     still the demo seeder's menu;
 *   - adds HN Medical System specialties (laparoscopic surgery, gynaecology,
 *     urology, ENT, orthopaedics) and solutions (complete sets, endoscopy
 *     systems, spares), linked to catalogue products (hn-taxonomy.ts);
 *   - switches the demo seeder's specialties, solutions, placeholder brands,
 *     city pages and articles to draft, so the header and footer stop linking
 *     to hospital-equipment content. Nothing is deleted;
 *   - fills in the company name, description, contact details and default
 *     titles from the catalogue where they are blank or still hold the demo
 *     seeder's placeholders. Anything an administrator typed is kept.
 *
 * Nothing runs automatically. After running it, restart the application so
 * cached pages are rebuilt.
 */

const DRY_RUN = process.argv.includes("--dry-run");
const IMAGES = path.resolve(process.cwd(), "public/images/hn/catalogue");
/** The demo seeder's homepage object, swapped for a catalogue picture. */
const DEMO_HERO_IMAGE = "demo-hero-ct-scanner.webp";
const HERO_IMAGE = HOME_IMAGES.hero;
/** Records the homepage this script published, so it is only done once. */
const HOME_MARKER = "catalogue.homepage";
const ABOUT_MARKER = "catalogue.about";
const SUPPORT_MARKER = "catalogue.support";
const PRIVACY_MARKER = "catalogue.privacy";
const TERMS_MARKER = "catalogue.terms";
const DEMO_MANIFEST = "demo.manifest";

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

/* ---------------------------------------------------------------- pages -- */

type PageResult = { result: "published" | "already" | "would publish"; previous: string | null };
type SectionRows = Array<{ type: string; content: Record<string, unknown>; design: Record<string, unknown> }>;

/**
 * Publishes one of the HN Medical System pages at `slug`, once. The page it
 * replaces stays in Pages as a draft under a slug of its own, and a marker
 * setting records that it was done, so later runs leave the editors' page
 * alone.
 */
async function publishPage(params: {
  slug: string;
  title: string;
  marker: string;
  label: string;
  build: () => Promise<SectionRows>;
}): Promise<PageResult> {
  const marker = await prisma.setting.findUnique({ where: { key: params.marker }, select: { key: true } });
  if (marker) return { result: "already", previous: null };

  const current = await prisma.page.findUnique({ where: { slug: params.slug }, select: { id: true, title: true } });
  const previousSlug = `${params.slug}-previous-${new Date().toISOString().slice(0, 10)}`;
  if (DRY_RUN) return { result: "would publish", previous: current ? previousSlug : null };

  const sections = await params.build();

  let previous: string | null = null;
  if (current) {
    previous = previousSlug;
    for (let n = 2; await prisma.page.findUnique({ where: { slug: previous }, select: { id: true } }); n++) {
      previous = `${previousSlug}-${n}`;
    }
    await prisma.page.update({
      where: { id: current.id },
      data: { slug: previous, title: `${current.title} (previous)`, status: "DRAFT", publishedAt: null },
    });
  }

  const page = await prisma.page.create({
    data: {
      slug: params.slug,
      title: params.title,
      ...live(),
      sections: {
        create: sections.map((section, order) => ({
          type: section.type as never,
          order,
          enabled: true,
          content: json(section.content),
          design: json({ ...DEFAULT_SECTION_DESIGN, ...section.design }),
        })),
      },
    },
    select: { id: true },
  });

  await prisma.setting.create({
    data: {
      key: params.marker,
      group: "system",
      type: "JSON",
      label: `Catalogue ${params.label}`,
      description: `Written by the catalogue seeder once it has published the HN Medical System ${params.label}.`,
      jsonValue: json({ pageId: page.id, previous }),
    },
  });
  await recordAuditEvent({
    action: "PAGE_CREATED",
    module: "PAGES",
    entityType: "Page",
    entityId: page.id,
    summary: previous
      ? `Published the HN Medical System ${params.label}; the previous one is kept as the draft /${previous}`
      : `Published the HN Medical System ${params.label}`,
    metadata: { source: "seed-catalogue" },
  });
  return { result: "published", previous };
}

const liveProductCount = () => prisma.product.count({ where: { deletedAt: null, status: "PUBLISHED" } });

async function buildHomepage(): Promise<SectionRows> {
  const products = await prisma.product.findMany({
    where: { slug: { in: [...catalogueSlugs] }, deletedAt: null, status: "PUBLISHED" },
    select: { id: true, name: true, slug: true, shortDescription: true, primaryImageId: true },
  });
  const byName = new Map(products.map((product) => [product.name, product]));
  const pick = (names: string[]) => names.map((name) => byName.get(name)).filter((row) => row !== undefined);

  const categories = await prisma.category.findMany({
    where: { slug: { in: HN_CATALOGUE.map((category) => slugify(category.name)) }, parentId: null, deletedAt: null },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  const setsCategory = HN_CATALOGUE.find((category) => category.subs.some((sub) => sub.name === "Laparoscopy Sets & Systems"));

  return hnHomeSections({
    heroImage: await image(HOME_IMAGES.hero, "Polymer clip applicators, gold, purple and green"),
    setsImage: await image(HOME_IMAGES.sets, "Laparoscopy instruments: trocars, graspers and a needle holder"),
    cards: pick(HOME_PRODUCTS.cards).map((product) => ({
      title: product.name,
      detail: product.shortDescription?.split(/[.,:]/)[0]?.slice(0, 80) ?? "",
      image: product.primaryImageId ?? "",
      href: `/products/${product.slug}`,
    })),
    categories: categories.map((category) => category.id),
    bento: pick(HOME_PRODUCTS.bento).map((product) => product.id),
    endoscopy: pick(HOME_PRODUCTS.endoscopy).map((product) => product.id),
    productCount: await liveProductCount(),
    setsHref: setsCategory
      ? `/categories/${slugify(setsCategory.name)}/${slugify("Laparoscopy Sets & Systems")}`
      : "/products",
  });
}

async function buildAbout(): Promise<SectionRows> {
  return hnAboutSections({
    heroImage: await image(ABOUT_IMAGES.hero, "Perforated sterilization tray with lid and silicone instrument holders"),
    rangeImage: await image(ABOUT_IMAGES.range, "Laparoscopy instruments: trocars, graspers and a needle holder"),
    productCount: await liveProductCount(),
  });
}

async function buildSupport(): Promise<SectionRows> {
  return hnSupportSections({
    heroImage: await image(SUPPORT_IMAGE, "Sterilization tray lid marked HN Medical System, Rohtak"),
  });
}

/** Today, as the policies print it: "15 October 2026". */
const today = () =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());

/* ------------------------------------------------------------- taxonomy -- */

/** Catalogue product names for an entry; "*Category" means every product in it. */
function productNames(entry: TaxonomyEntry): string[] {
  return entry.products.flatMap((name) => {
    if (!name.startsWith("*")) return [name];
    const category = HN_CATALOGUE.find((row) => row.name === name.slice(1));
    return category ? category.subs.flatMap((sub) => sub.products.map((product) => product.name)) : [];
  });
}

/**
 * Adds the HN Medical System specialties and solutions, linked to catalogue
 * products and categories. One that already exists under the same address is
 * left as it is.
 */
async function addTaxonomy(): Promise<{ specialties: number; solutions: number }> {
  const result = { specialties: 0, solutions: 0 };
  const products = await prisma.product.findMany({
    where: { slug: { in: [...catalogueSlugs] }, deletedAt: null },
    select: { id: true, name: true },
  });
  const productIds = new Map(products.map((product) => [product.name, product.id]));
  const categories = await prisma.category.findMany({
    where: { slug: { in: HN_CATALOGUE.map((category) => slugify(category.name)) }, parentId: null, deletedAt: null },
    select: { id: true, name: true },
  });
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
  const ids = (names: string[], from: Map<string, string>) =>
    [...new Set(names.map((name) => from.get(name)).filter((id): id is string => Boolean(id)))];

  for (const [order, entry] of HN_SPECIALTIES.entries()) {
    const slug = slugify(entry.name);
    if (await prisma.specialty.findUnique({ where: { slug }, select: { id: true } })) continue;
    result.specialties++;
    if (DRY_RUN) continue;
    const picture = await image(entry.image, entry.imageAlt);
    const row = await prisma.specialty.create({
      data: {
        slug,
        name: entry.name,
        shortDescription: entry.short,
        description: entry.description,
        imageId: picture,
        bannerId: picture,
        featured: entry.featured ?? false,
        order,
        ...live(),
      },
      select: { id: true },
    });
    await prisma.productSpecialty.createMany({
      data: ids(productNames(entry), productIds).map((productId) => ({ productId, specialtyId: row.id })),
      skipDuplicates: true,
    });
    await prisma.categorySpecialty.createMany({
      data: ids(entry.categories, categoryIds).map((categoryId) => ({ categoryId, specialtyId: row.id })),
      skipDuplicates: true,
    });
  }

  for (const [order, entry] of HN_SOLUTIONS.entries()) {
    const slug = slugify(entry.name);
    if (await prisma.solution.findUnique({ where: { slug }, select: { id: true } })) continue;
    result.solutions++;
    if (DRY_RUN) continue;
    const picture = await image(entry.image, entry.imageAlt);
    const row = await prisma.solution.create({
      data: {
        slug,
        name: entry.name,
        shortDescription: entry.short,
        description: entry.description,
        imageId: picture,
        bannerId: picture,
        featured: entry.featured ?? false,
        order,
        ...live(),
      },
      select: { id: true },
    });
    await prisma.productSolution.createMany({
      data: ids(productNames(entry), productIds).map((productId) => ({ productId, solutionId: row.id })),
      skipDuplicates: true,
    });
    await prisma.solutionCategory.createMany({
      data: ids(entry.categories, categoryIds).map((categoryId) => ({ categoryId, solutionId: row.id })),
      skipDuplicates: true,
    });
  }
  return result;
}

/* --------------------------------------------------------------- header -- */

/**
 * Replaces the header menu, but only while it is still exactly the demo
 * seeder's: a menu an administrator has edited is left alone.
 */
async function replaceDemoHeader(): Promise<boolean> {
  const menu = await prisma.navigationMenu.findUnique({
    where: { key: "HEADER" },
    select: { id: true, items: { orderBy: { order: "asc" }, select: { id: true, label: true, href: true, parentId: true } } },
  });
  if (!menu) return false;
  const current = menu.items.map((item) => [item.label, item.href ?? ""]);
  const isDemo =
    current.length === DEMO_HEADER_ITEMS.length &&
    menu.items.every((item) => item.parentId === null) &&
    current.every(([label, href], index) => label === DEMO_HEADER_ITEMS[index][0] && href === DEMO_HEADER_ITEMS[index][1]);
  if (!isDemo) return false;
  if (DRY_RUN) return true;

  await prisma.navigationItem.deleteMany({ where: { id: { in: menu.items.map((item) => item.id) } } });
  for (const [order, [label, href]] of HEADER_ITEMS.entries()) {
    await prisma.navigationItem.create({ data: { menuId: menu.id, label, href, order } });
  }
  await recordAuditEvent({
    action: "NAVIGATION_ITEM_UPDATED",
    module: "NAVIGATION",
    summary: `Header menu set to ${HEADER_ITEMS.map(([label]) => label).join(", ")} for HN Medical System`,
    metadata: { source: "seed-catalogue" },
  });
  return true;
}

/* ------------------------------------------------------------ demo pages -- */

/**
 * The demo seeder's hospital-equipment content — specialties, solutions,
 * placeholder brands, city pages and articles — taken off the site by
 * switching it to draft. Nothing is deleted: each can be published again, and
 * `seed-demo --remove` still removes it all.
 */
async function unpublishDemoContent(): Promise<Record<string, number>> {
  const demo = { startsWith: "demo-" };
  const manifest = await prisma.setting.findUnique({ where: { key: DEMO_MANIFEST }, select: { jsonValue: true } });
  const cityIds = ((manifest?.jsonValue as { cities?: string[] } | null)?.cities ?? []).filter(Boolean);
  const draft = { status: "DRAFT" as const, publishedAt: null };
  const published = { status: "PUBLISHED" as const };

  if (DRY_RUN) {
    const [specialties, solutions, brands, cities, posts] = await Promise.all([
      prisma.specialty.count({ where: { slug: demo, ...published } }),
      prisma.solution.count({ where: { slug: demo, ...published } }),
      prisma.brand.count({ where: { slug: demo, ...published } }),
      prisma.city.count({ where: { id: { in: cityIds }, ...published } }),
      prisma.blogPost.count({ where: { slug: demo, ...published } }),
    ]);
    return { specialties, solutions, brands, cities, posts };
  }

  const [specialties, solutions, brands, cities, posts] = await Promise.all([
    prisma.specialty.updateMany({ where: { slug: demo, ...published }, data: draft }),
    prisma.solution.updateMany({ where: { slug: demo, ...published }, data: draft }),
    prisma.brand.updateMany({ where: { slug: demo, ...published }, data: draft }),
    prisma.city.updateMany({ where: { id: { in: cityIds }, ...published }, data: draft }),
    prisma.blogPost.updateMany({ where: { slug: demo, ...published }, data: draft }),
  ]);
  return {
    specialties: specialties.count,
    solutions: solutions.count,
    brands: brands.count,
    cities: cities.count,
    posts: posts.count,
  };
}

/* ------------------------------------------------------------- settings -- */

async function fillCompanySettings(): Promise<string[]> {
  const changed: string[] = [];
  for (const [key, value] of Object.entries(COMPANY_SETTINGS)) {
    const definition = SETTINGS_BY_KEY.get(key);
    if (!definition) continue;
    const row = await prisma.setting.findUnique({ where: { key }, select: { value: true } });
    const currentValue = row?.value ?? null;
    const placeholder = !currentValue || currentValue === DEMO_SETTING_VALUES[key];
    if (!placeholder || currentValue === value) continue;
    changed.push(key);
    if (DRY_RUN) continue;
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        group: definition.group,
        type: definition.type,
        label: definition.label,
        description: definition.description,
        value,
        isSecret: definition.isSecret ?? false,
      },
    });
  }

  // The demo seeder restores the settings it filled when its content is
  // removed; these now hold real details, so take them off its list.
  if (!DRY_RUN && changed.length) {
    const manifest = await prisma.setting.findUnique({ where: { key: DEMO_MANIFEST }, select: { jsonValue: true } });
    const data = manifest?.jsonValue as { settings?: Record<string, unknown> } | null;
    if (data?.settings) {
      for (const key of changed) delete data.settings[key];
      await prisma.setting.update({ where: { key: DEMO_MANIFEST }, data: { jsonValue: json(data) } });
    }
  }
  if (!DRY_RUN && changed.length) {
    await recordAuditEvent({
      action: "SETTINGS_UPDATED",
      module: "SETTINGS",
      summary: `Filled ${changed.join(", ")} from the HN Medical System catalogue`,
      metadata: { source: "seed-catalogue", keys: changed },
    });
  }
  return changed;
}

/* ------------------------------------------------------------------ run -- */

async function run(): Promise<void> {
  if (DRY_RUN) console.log("Dry run: nothing will be changed.\n");

  const added = await add();
  const removed = await remove();
  const taxonomy = await addTaxonomy();
  const pages = await repointPages(removed);
  const home = await publishPage({ slug: "home", title: "Homepage", marker: HOME_MARKER, label: "homepage", build: buildHomepage });
  const about = await publishPage({ slug: "about", title: "About us", marker: ABOUT_MARKER, label: "About page", build: buildAbout });
  const support = await publishPage({ slug: "support", title: "Support", marker: SUPPORT_MARKER, label: "Support page", build: buildSupport });
  const privacy = await publishPage({
    slug: "privacy",
    title: "Privacy policy",
    marker: PRIVACY_MARKER,
    label: "Privacy policy page",
    build: async () => hnPrivacySections({ updated: today() }),
  });
  const terms = await publishPage({
    slug: "terms",
    title: "Terms of use",
    marker: TERMS_MARKER,
    label: "Terms of use page",
    build: async () => hnTermsSections({ updated: today() }),
  });
  const header = await replaceDemoHeader();
  const demo = await unpublishDemoContent();
  const settings = await fillCompanySettings();

  const verb = DRY_RUN ? "Would add" : "Added";
  console.log(`${verb} ${added.categories} categories and ${added.products} products from the HN Medical System catalogue.`);
  if (added.kept.length) console.log(`Already there, left unchanged: ${added.kept.length} products.`);
  console.log(
    `${verb} ${taxonomy.specialties} specialties and ${taxonomy.solutions} solutions for HN Medical System` +
      (taxonomy.specialties + taxonomy.solutions === 0 ? " (already there)." : "."),
  );
  if (added.skipped.length) console.log(`Skipped because they are in the bin: ${added.skipped.join(", ")}.`);
  console.log(
    `${DRY_RUN ? "Would move" : "Moved"} ${removed.products.length} other products and ${removed.categories.length} empty categories to the bin` +
      (removed.products.length ? ":" : "."),
  );
  for (const product of removed.products) console.log(`  - ${product.name}`);
  console.log(`${DRY_RUN ? "Would update" : "Updated"} ${pages} page sections that pointed at them.`);
  for (const [label, page] of [
    ["homepage", home],
    ["About page", about],
    ["Support page", support],
    ["Privacy policy page", privacy],
    ["Terms of use page", terms],
  ] as const) {
    if (page.result === "already") console.log(`The HN Medical System ${label} was published on an earlier run; left as it is.`);
    else
      console.log(
        `${page.result === "published" ? "Published" : "Would publish"} the HN Medical System ${label}` +
          (page.previous ? `; the previous one is kept as the draft page "${page.previous}".` : "."),
      );
  }
  console.log(
    header
      ? `${DRY_RUN ? "Would set" : "Set"} the header menu to ${HEADER_ITEMS.map(([label]) => label).join(", ")}.`
      : "Header menu is not the demo one; left as it is.",
  );
  const unpublished = Object.entries(demo).filter(([, count]) => count > 0);
  console.log(
    unpublished.length
      ? `${DRY_RUN ? "Would switch" : "Switched"} demo content to draft: ${unpublished.map(([kind, count]) => `${count} ${kind}`).join(", ")}.`
      : "No published demo specialties, solutions, brands, cities or articles.",
  );
  console.log(
    settings.length
      ? `${DRY_RUN ? "Would fill" : "Filled"} from the catalogue: ${settings.join(", ")}.`
      : "Company and contact settings already set; left as they are.",
  );
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
