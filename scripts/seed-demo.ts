import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import type { Prisma } from "../src/generated/prisma/client";
import { DEFAULT_SECTION_DESIGN } from "../src/lib/design/section-options";
import type { StorageFolder } from "../src/server/storage/config";
import { prisma } from "../src/server/db";
import {
  buildStorageKey,
  resolveStoragePath,
} from "../src/server/storage/paths";
import { SETTINGS_BY_KEY } from "../src/server/settings/registry";
import { starterHomeSections } from "../src/server/cms/homepage";
import {
  APPLICATIONS,
  BRANDS,
  CATALOGUE,
  CATEGORY_FAQS,
  PRODUCT_FAQS,
  SOLUTIONS,
  SPECIALTIES,
  type DemoProduct,
} from "./demo/catalogue";
import { ABOUT, CITIES, CITY_FAQS, POLICY, POSTS } from "./demo/editorial";

/**
 * Demo content for the whole public site, to present it fully populated
 * before the real catalogue and copy are ready.
 *
 *   node ops/seed-demo.mjs            # add and publish the demo content
 *   node ops/seed-demo.mjs --remove   # take all of it out again
 *
 * (In development: npm run db:seed:demo [-- --remove].)
 *
 * Nothing runs automatically: the script only ever acts when someone runs it.
 *
 * What it adds: ten equipment categories with subcategories, twenty-six
 * products (renders, gallery, highlights, features, grouped specifications, a
 * brochure PDF and FAQs), placeholder partner brands, specialties, solutions,
 * applications, six articles, ten city pages, About / Privacy / Terms pages, a
 * published homepage and a header menu if the header is empty. Imagery comes
 * from public/images/hn and is copied into the media library so editors can
 * swap it like any upload.
 *
 * How it stays identifiable and removable:
 *   - every catalogue record, article and media file starts "demo-";
 *   - pages, cities, menu items and settings it creates or fills are listed in
 *     a manifest (setting "demo.manifest"), and --remove restores exactly
 *     those — a page, city or setting that already existed is never touched;
 *   - brands are named "Partner Alpha…Omega" with generic marks, specification
 *     values are typical ranges, figures on the homepage are labelled
 *     indicative; no prices, ratings, clients or certifications;
 *   - "Ask search engines not to index this site" is switched on while the
 *     demo is up. Switch it off in Settings → SEO once real content is in.
 *
 * After adding or removing, restart the application (or wait for the cached
 * pages to refresh) so prerendered pages are rebuilt from the database.
 */

const PREFIX = "demo-";
const MANIFEST_KEY = "demo.manifest";
/** The earlier seeder's naming, still recognised by --remove. */
const LEGACY_TITLE = "Demo – ";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const slug = (name: string) => PREFIX + slugify(name);

type Manifest = {
  pages: string[];
  cities: string[];
  states: string[];
  menuItems: string[];
  /** Demo popups. Always created switched off. */
  popups: string[];
  /** Settings this script filled, with the value they had before. */
  settings: Record<string, string | null>;
};

const EMPTY_MANIFEST: Manifest = {
  pages: [],
  cities: [],
  states: [],
  menuItems: [],
  popups: [],
  settings: {},
};

async function readManifest(): Promise<Manifest> {
  const row = await prisma.setting.findUnique({
    where: { key: MANIFEST_KEY },
    select: { jsonValue: true },
  });
  return { ...EMPTY_MANIFEST, ...((row?.jsonValue ?? {}) as Partial<Manifest>) };
}

async function writeManifest(manifest: Manifest): Promise<void> {
  await prisma.setting.upsert({
    where: { key: MANIFEST_KEY },
    update: { jsonValue: manifest as unknown as Prisma.InputJsonValue },
    create: {
      key: MANIFEST_KEY,
      group: "system",
      type: "JSON",
      label: "Demo content manifest",
      description: "Written by the demo seeder so --remove can undo exactly what it added.",
      jsonValue: manifest as unknown as Prisma.InputJsonValue,
    },
  });
}

/* ---------------------------------------------------------------- media -- */

const IMAGES = path.resolve(process.cwd(), "public/images/hn");

const DIMENSIONS: Record<string, [number, number]> = {
  brands: [240, 60],
};

async function storeFile(params: {
  originalName: string;
  bytes: Buffer;
  folder: StorageFolder;
  extension: string;
  mimeType: string;
  kind: "IMAGE" | "VECTOR" | "DOCUMENT";
  title: string;
  altText?: string;
  width?: number;
  height?: number;
}): Promise<string> {
  const existing = await prisma.mediaAsset.findFirst({
    where: { originalName: params.originalName, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const storageKey = buildStorageKey({ folder: params.folder, extension: params.extension });
  const file = resolveStoragePath(storageKey);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, params.bytes, { mode: 0o640 });

  const asset = await prisma.mediaAsset.create({
    data: {
      storageKey,
      originalName: params.originalName,
      mimeType: params.mimeType,
      kind: params.kind,
      sizeBytes: params.bytes.length,
      width: params.width,
      height: params.height,
      title: params.title,
      altText: params.altText,
    },
    select: { id: true },
  });
  return asset.id;
}

/**
 * Width and height from a WebP header, without an image library (the bundled
 * ops script runs where native modules are not available).
 */
function webpSize(bytes: Buffer): [number, number] | null {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  if (chunk === "VP8 ") return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  return null;
}

/** A house image from public/images/hn, as a media library asset. */
async function image(
  rel: string,
  folder: StorageFolder,
  alt: string,
): Promise<string> {
  const [group, file] = rel.split("/");
  const extension = path.extname(file).slice(1);
  const bytes = await fs.readFile(path.join(IMAGES, rel));
  // Raster images report their real size (cut-outs are cropped to the
  // object, so no two share one); vector marks use their artboard.
  const [width, height] =
    (extension === "webp" ? webpSize(bytes) : null) ?? DIMENSIONS[group] ?? [1600, 1200];
  return storeFile({
    originalName: `${PREFIX}${group}-${file}`,
    bytes,
    folder,
    extension,
    mimeType: extension === "svg" ? "image/svg+xml" : "image/webp",
    kind: extension === "svg" ? "VECTOR" : "IMAGE",
    title: alt,
    altText: alt,
    width,
    height,
  });
}

const scene = (key: string, alt: string) => image(`scenes/${key}.webp`, "general", alt);

/* ------------------------------------------------------------ brochure -- */

/** A one-page product overview PDF, drawn directly so no library is needed. */
function brochurePdf(product: DemoProduct, category: string): Buffer {
  const ascii = (text: string) =>
    text
      .replace(/₂/g, "2")
      .replace(/[–—]/g, "-")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/×/g, "x")
      .replace(/±/g, "+/-")
      .replace(/≥/g, ">=")
      .replace(/°/g, " deg")
      .replace(/\*\*/g, "")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/([\\()])/g, "\\$1");

  const wrap = (text: string, width: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if ((line + " " + word).trim().length > width) {
        lines.push(line.trim());
        line = word;
      } else line += " " + word;
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  };

  const ops: string[] = [];
  ops.push("0.039 0.086 0.149 rg 0 742 595 100 re f");
  ops.push("0.18 0.74 0.84 rg 48 768 4 40 re f");
  ops.push(`BT /F1 9 Tf 1 1 1 rg 62 798 Td (${ascii("HN MEDICAL  |  PRODUCT OVERVIEW")}) Tj ET`);
  ops.push(`BT /F1 20 Tf 1 1 1 rg 62 772 Td (${ascii(product.name)}) Tj ET`);
  let y = 712;
  ops.push(`BT /F1 9 Tf 0.12 0.4 0.86 rg 48 ${y} Td (${ascii(category.toUpperCase())}) Tj ET`);
  y -= 22;
  for (const line of wrap(ascii(product.short), 88)) {
    ops.push(`BT /F2 11 Tf 0.04 0.09 0.15 rg 48 ${y} Td (${line}) Tj ET`);
    y -= 16;
  }
  y -= 8;
  ops.push(`BT /F1 12 Tf 0.04 0.09 0.15 rg 48 ${y} Td (Highlights) Tj ET`);
  y -= 18;
  for (const point of product.highlights) {
    ops.push(`0.18 0.74 0.84 rg 50 ${y + 2} 4 4 re f`);
    ops.push(`BT /F2 10 Tf 0.25 0.32 0.39 rg 62 ${y} Td (${ascii(point)}) Tj ET`);
    y -= 15;
  }
  for (const group of product.specs) {
    y -= 12;
    ops.push(`BT /F1 12 Tf 0.04 0.09 0.15 rg 48 ${y} Td (${ascii(group.label)}) Tj ET`);
    y -= 6;
    for (const [label, value, unit] of group.items) {
      y -= 16;
      ops.push(`0.86 0.89 0.93 RG 0.5 w 48 ${y - 5} m 547 ${y - 5} l S`);
      ops.push(`BT /F2 10 Tf 0.33 0.4 0.49 rg 48 ${y} Td (${ascii(label)}) Tj ET`);
      ops.push(`BT /F2 10 Tf 0.04 0.09 0.15 rg 250 ${y} Td (${ascii(unit ? `${value} ${unit}` : value)}) Tj ET`);
    }
  }
  ops.push(`BT /F2 8 Tf 0.43 0.5 0.6 rg 48 48 Td (${ascii("Demonstration document. Specifications are typical values for illustration; confirm the configuration with your quotation.")}) Tj ET`);

  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/* ------------------------------------------------------------- sections -- */

const json = (value: unknown) => value as Prisma.InputJsonValue;

type SectionInput = { type: string; content: object; design?: object };

const sectionRows = (rows: SectionInput[]) =>
  rows.map((row, order) => ({
    type: row.type as never,
    order,
    enabled: true,
    content: json(row.content),
    design: json({ ...DEFAULT_SECTION_DESIGN, ...row.design }),
  }));

/* ------------------------------------------------------------------ add -- */

async function fillSetting(manifest: Manifest, key: string, value: string) {
  const definition = SETTINGS_BY_KEY.get(key);
  if (!definition) return;
  const row = await prisma.setting.findUnique({ where: { key }, select: { value: true } });
  // Only fill what an administrator has not set.
  if (row?.value && !(key in manifest.settings)) return;
  if (!(key in manifest.settings)) manifest.settings[key] = row?.value ?? null;
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

async function add(): Promise<void> {
  const now = new Date();
  const live = { status: "PUBLISHED" as const, publishedAt: now };
  const manifest = await readManifest();
  let created = 0;

  // ---- brands
  const brandIds = new Map<string, string>();
  for (const [order, brand] of BRANDS.entries()) {
    const brandSlug = slug(brand.name);
    const existing = await prisma.brand.findUnique({ where: { slug: brandSlug }, select: { id: true } });
    const row =
      existing ??
      (await prisma.brand.create({
        data: {
          slug: brandSlug,
          name: brand.name,
          shortDescription:
            "Placeholder manufacturer partner for demonstration. Replace with the brands you represent.",
          description:
            "This brand is a neutral placeholder used to demonstrate how manufacturer pages, logo strips and filters appear on the site.",
          logoId: await image(`brands/${brand.key}.svg`, "brands", `${brand.name} logo`),
          featured: true,
          order,
          ...live,
        },
        select: { id: true },
      }));
    if (!existing) created++;
    brandIds.set(brand.key.replace(/^./, (c) => c.toUpperCase()), row.id);
  }

  // ---- specialties, solutions, applications (linked to products below)
  const specialtyIds = new Map<string, string>();
  for (const [order, specialty] of SPECIALTIES.entries()) {
    const s = slug(specialty.name);
    const existing = await prisma.specialty.findUnique({ where: { slug: s }, select: { id: true } });
    const row =
      existing ??
      (await prisma.specialty.create({
        data: {
          slug: s,
          name: specialty.name,
          shortDescription: specialty.short,
          description: `${specialty.short}\n\nWe work with ${specialty.name.toLowerCase()} teams to plan equipment for new departments and upgrades, matching configurations to case mix, bed count and existing infrastructure. Browse the related categories and products below, or send us your requirement for a consolidated quotation.`,
          imageId: await scene(specialty.image, `${specialty.name} clinical environment`),
          bannerId: await scene(specialty.image, `${specialty.name} clinical environment`),
          featured: true,
          order,
          ...live,
        },
        select: { id: true },
      }));
    if (!existing) created++;
    specialtyIds.set(specialty.name, row.id);
  }

  const solutionIds = new Map<string, string>();
  for (const [order, solution] of SOLUTIONS.entries()) {
    const s = slug(solution.name);
    const existing = await prisma.solution.findUnique({ where: { slug: s }, select: { id: true } });
    const row =
      existing ??
      (await prisma.solution.create({
        data: {
          slug: s,
          name: solution.name,
          shortDescription: solution.short,
          description: `${solution.short}\n\nOur team helps define the scope — rooms, quantities and configurations — and coordinates supply, installation and user orientation as one project. Each package is quoted to the institution's requirement.`,
          imageId: await scene(solution.image, `${solution.name}`),
          bannerId: await scene(solution.image, `${solution.name}`),
          featured: order < 4,
          order,
          ...live,
        },
        select: { id: true },
      }));
    if (!existing) created++;
    solutionIds.set(solution.name, row.id);
  }

  const applicationIds = new Map<string, string>();
  for (const [order, application] of APPLICATIONS.entries()) {
    const s = slug(application.name);
    const existing = await prisma.application.findUnique({ where: { slug: s }, select: { id: true } });
    const row =
      existing ??
      (await prisma.application.create({
        data: {
          slug: s,
          name: application.name,
          description: application.description,
          imageId: await scene(application.image, application.name),
          order,
        },
        select: { id: true },
      }));
    if (!existing) created++;
    applicationIds.set(application.name, row.id);
  }

  // ---- catalogue
  const categoryIds = new Map<string, string>();
  const productIds = new Map<string, string>();
  const productsByCategory = new Map<string, string[]>();

  for (const [order, category] of CATALOGUE.entries()) {
    const parentSlug = slug(category.name);
    let parent = await prisma.category.findFirst({
      where: { slug: parentSlug, parentId: null },
      select: { id: true },
    });
    if (!parent) {
      const imageId = await image(`categories/${category.image}.webp`, "categories", `${category.name} equipment`);
      parent = await prisma.category.create({
        data: {
          slug: parentSlug,
          name: category.name,
          shortDescription: category.short,
          description: category.description,
          procurementInfo: category.procurement,
          imageId,
          depth: 0,
          order,
          featured: category.featured ?? false,
          ...live,
        },
        select: { id: true },
      });
      created++;
      await prisma.faq.createMany({
        data: CATEGORY_FAQS.map((faq, faqOrder) => ({
          entityType: "Category",
          entityId: parent!.id,
          question: faq.question,
          answer: faq.answer,
          order: faqOrder,
        })),
      });
    }
    categoryIds.set(category.name, parent.id);
    const inCategory: string[] = [];

    for (const [subOrder, sub] of category.subs.entries()) {
      const subSlug = slug(sub.name);
      const child =
        (await prisma.category.findFirst({
          where: { slug: subSlug, parentId: parent.id },
          select: { id: true },
        })) ??
        (await prisma.category.create({
          data: {
            slug: subSlug,
            name: sub.name,
            shortDescription: sub.short,
            imageId: await image(`products/${sub.products[0].image}.webp`, "categories", sub.name),
            parentId: parent.id,
            depth: 1,
            order: subOrder,
            ...live,
          },
          select: { id: true },
        }));

      for (const [productOrder, product] of sub.products.entries()) {
        const productSlug = slug(product.name);
        const existing = await prisma.product.findUnique({ where: { slug: productSlug }, select: { id: true } });
        if (existing) {
          productIds.set(product.name, existing.id);
          inCategory.push(existing.id);
          continue;
        }

        const primaryImageId = await image(`products/${product.image}.webp`, "products", product.name);
        const row = await prisma.product.create({
          data: {
            slug: productSlug,
            name: product.name,
            shortDescription: product.short,
            description: product.body,
            categoryId: child.id,
            brandId: brandIds.get(product.brand) ?? null,
            primaryImageId,
            featured: product.featured ?? false,
            order: productOrder,
            ...live,
          },
          select: { id: true },
        });
        created++;
        productIds.set(product.name, row.id);
        inCategory.push(row.id);

        if (product.alt) {
          const altId = await image(`products/${product.image}-alt.webp`, "products", `${product.name}, alternate view`);
          await prisma.productImage.create({ data: { productId: row.id, mediaId: altId, order: 0 } });
        }

        await prisma.productPoint.createMany({
          data: [
            ...product.highlights.map((title, index) => ({
              productId: row.id,
              kind: "HIGHLIGHT" as const,
              title,
              order: index,
            })),
            ...product.features.map(([title, body], index) => ({
              productId: row.id,
              kind: "FEATURE" as const,
              title,
              body,
              order: index,
            })),
          ],
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

        const pdfId = await storeFile({
          originalName: `${productSlug}-brochure.pdf`,
          bytes: brochurePdf(product, category.name),
          folder: "brochures",
          extension: "pdf",
          mimeType: "application/pdf",
          kind: "DOCUMENT",
          title: `${product.name} — product overview`,
        });
        await prisma.productDocument.create({
          data: {
            productId: row.id,
            mediaId: pdfId,
            title: `${product.name} — product overview`,
            kind: "BROCHURE",
            gated: false,
          },
        });

        await prisma.faq.createMany({
          data: PRODUCT_FAQS.map((faq, faqOrder) => ({
            entityType: "Product",
            entityId: row.id,
            question: faq.question,
            answer: faq.answer,
            order: faqOrder,
          })),
        });

        const pick = (names: string[], from: Map<string, string>) =>
          names.map((name) => from.get(name)).filter((id): id is string => Boolean(id));
        await prisma.productSpecialty.createMany({
          data: pick(product.specialties, specialtyIds).map((specialtyId) => ({ productId: row.id, specialtyId })),
          skipDuplicates: true,
        });
        await prisma.productSolution.createMany({
          data: pick(product.solutions, solutionIds).map((solutionId) => ({ productId: row.id, solutionId })),
          skipDuplicates: true,
        });
        await prisma.productApplication.createMany({
          data: pick(product.applications, applicationIds).map((applicationId) => ({ productId: row.id, applicationId })),
          skipDuplicates: true,
        });
      }
    }
    productsByCategory.set(category.name, inCategory);
  }

  // Related products: others in the same category, then the neighbouring one.
  const categoryNames = CATALOGUE.map((category) => category.name);
  for (const [index, name] of categoryNames.entries()) {
    const own = productsByCategory.get(name) ?? [];
    const next = productsByCategory.get(categoryNames[(index + 1) % categoryNames.length]) ?? [];
    for (const productId of own) {
      const related = [...own.filter((id) => id !== productId), ...next].slice(0, 3);
      await prisma.productRelated.createMany({
        data: related.map((relatedId, order) => ({ productId, relatedId, order })),
        skipDuplicates: true,
      });
    }
  }

  // Taxonomy ↔ category links.
  for (const specialty of SPECIALTIES) {
    const specialtyId = specialtyIds.get(specialty.name)!;
    await prisma.categorySpecialty.createMany({
      data: specialty.categories
        .map((name) => categoryIds.get(name))
        .filter((id): id is string => Boolean(id))
        .map((categoryId) => ({ categoryId, specialtyId })),
      skipDuplicates: true,
    });
  }
  for (const solution of SOLUTIONS) {
    const solutionId = solutionIds.get(solution.name)!;
    await prisma.solutionCategory.createMany({
      data: solution.categories
        .map((name) => categoryIds.get(name))
        .filter((id): id is string => Boolean(id))
        .map((categoryId) => ({ categoryId, solutionId })),
      skipDuplicates: true,
    });
  }
  for (const brand of BRANDS) {
    const brandId = brandIds.get(brand.key.replace(/^./, (c) => c.toUpperCase()))!;
    const categories = CATALOGUE.filter((category) =>
      category.subs.some((sub) => sub.products.some((product) => product.brand.toLowerCase() === brand.key)),
    );
    await prisma.brandCategory.createMany({
      data: categories.map((category) => ({ brandId, categoryId: categoryIds.get(category.name)! })),
      skipDuplicates: true,
    });
  }

  // ---- articles
  for (const post of POSTS) {
    const postSlug = slug(post.title);
    if (await prisma.blogPost.findUnique({ where: { slug: postSlug } })) continue;
    const blocks = post.body.map((block) => {
      const headed = /^## (.+)\n([\s\S]+)$/.exec(block);
      return headed
        ? { type: "RICH_TEXT", content: { heading: headed[1], body: headed[2] }, design: { container: "narrow", spacing: "compact" } }
        : { type: "RICH_TEXT", content: { heading: "", body: block }, design: { container: "narrow", spacing: "compact" } };
    });
    const sections: SectionInput[] = [
      ...blocks,
      ...(post.faqs
        ? [{
            type: "FAQ",
            content: { overline: "", heading: "Frequently asked questions", intro: "", items: post.faqs.map(([question, answer]) => ({ question, answer })) },
            design: { container: "narrow" },
          }]
        : []),
    ];
    await prisma.blogPost.create({
      data: {
        slug: postSlug,
        title: post.title,
        excerpt: post.excerpt,
        authorName: post.author,
        coverId: await scene(post.image, post.title),
        featured: post.featured ?? false,
        status: "PUBLISHED",
        publishedAt: new Date(now.getTime() - post.daysAgo * 86_400_000),
        sections: { create: sectionRows(sections) },
      },
    });
    created++;
  }

  // ---- cities
  for (const city of CITIES) {
    if (await prisma.city.findUnique({ where: { slug: city.slug } })) continue;
    const stateSlug = slugify(city.state);
    let state = await prisma.state.findUnique({ where: { slug: stateSlug }, select: { id: true } });
    if (!state) {
      state = await prisma.state.create({ data: { name: city.state, slug: stateSlug }, select: { id: true } });
      manifest.states.push(state.id);
    }
    const featuredCategories = ["Critical Care", "Patient Monitoring", "Operation Theatre", "Diagnostics & Imaging"];
    const featuredProducts = ["Multi-Parameter Patient Monitor", "ICU Ventilator", "LED Operation Theatre Light", "Motorised ICU Bed"];
    const row = await prisma.city.create({
      data: {
        name: city.name,
        slug: city.slug,
        stateId: state.id,
        headline: `Medical equipment supply in ${city.name}`,
        intro: `Equipment and healthcare infrastructure solutions for hospitals, clinics and diagnostic centres in ${city.name} and across ${city.state}.`,
        heroImageId: await scene(city.image, `Clinical environment — ${city.name}`),
        content: `HN Medical supports healthcare institutions in ${city.name} with medical equipment across critical care, operation theatres, patient monitoring, diagnostics, neonatal care and hospital furniture.\n\nWhether you are equipping a new hospital, expanding an ICU or upgrading a single department, our team can help define the equipment list, prepare quotations and coordinate delivery and installation.`,
        coverage: `**Supply and installation.** Delivery, installation and commissioning are coordinated with your project and biomedical teams in ${city.name}.\n\n**Procurement support.** Equipment lists, specifications and consolidated quotations for departments and tenders.\n\n**After-sales coordination.** Service coordination and documentation after handover.`,
        ctaHeading: `Equipping a facility in ${city.name}?`,
        ctaBody: "Tell us the department, the equipment and the timeline. Everything is quoted to your requirement.",
        status: "PUBLISHED",
        publishedAt: now,
        indexable: false,
        categories: {
          create: featuredCategories
            .map((name) => categoryIds.get(name))
            .filter((id): id is string => Boolean(id))
            .map((categoryId, order) => ({ categoryId, order })),
        },
        products: {
          create: featuredProducts
            .map((name) => productIds.get(name))
            .filter((id): id is string => Boolean(id))
            .map((productId, order) => ({ productId, order })),
        },
        specialties: {
          create: ["Critical Care", "General Surgery", "Emergency Medicine"]
            .map((name) => specialtyIds.get(name))
            .filter((id): id is string => Boolean(id))
            .map((specialtyId, order) => ({ specialtyId, order })),
        },
      },
      select: { id: true },
    });
    await prisma.faq.createMany({
      data: CITY_FAQS.map(([question, answer], order) => ({
        entityType: "City",
        entityId: row.id,
        question: question.replaceAll("{city}", city.name),
        answer: answer.replaceAll("{city}", city.name),
        order,
      })),
    });
    manifest.cities.push(row.id);
    created++;
  }

  // ---- settings the demo needs, only where nobody has set them
  await fillSetting(manifest, "company.name", "HN Medical");
  await fillSetting(manifest, "company.description", "HN Medical provides advanced medical equipment and healthcare infrastructure solutions for hospitals, clinics, diagnostic centres and healthcare institutions across India.");
  await fillSetting(manifest, "contact.email", "enquiries@hnmedical.example");
  await fillSetting(manifest, "contact.address", "Corporate Office\nNew Delhi, India");
  await fillSetting(manifest, "contact.hours", "Monday to Saturday, 9:30 am – 6:30 pm IST");
  await fillSetting(manifest, "seo.defaultTitle", "HN Medical — Medical Equipment & Healthcare Infrastructure");
  await fillSetting(manifest, "seo.titleTemplate", "%s | HN Medical");

  // ---- pages
  const aboutHero = await scene("corridor", "Hospital corridor");
  const aboutImage = await scene("station", "Nurses' station with central monitoring");
  const supportImage = await scene("icu", "Equipped intensive care bay with ventilator and patient monitoring");
  const pages = [
    {
      slug: "about",
      title: "About us",
      sections: [
        { type: "HERO", content: { ...ABOUT.hero, primaryLabel: "Explore equipment", primaryHref: "/products", secondaryLabel: "Contact our team", secondaryHref: "/contact", image: aboutHero, note: "", points: [] }, design: { layout: "standard", background: "default", spacing: "large", container: "wide" } },
        { type: "IMAGE_TEXT", content: { image: aboutImage, overline: ABOUT.story.overline, heading: ABOUT.story.heading, body: ABOUT.story.body, points: ABOUT.story.points.map((title) => ({ title })), ctaLabel: "Our solutions", ctaHref: "/solutions" }, design: { layout: "editorial", imagePosition: "left", spacing: "large" } },
        { type: "ICON_CARDS", content: { overline: "What we do", heading: "From specification to support.", intro: "Services that sit around the equipment itself.", image: "", ctaLabel: "", ctaHref: "", items: [
          { title: "Equipment planning", body: "Room-by-room equipment lists for new facilities and department upgrades.", icon: "consultation", linkLabel: "", linkHref: "" },
          { title: "Procurement support", body: "Specifications, comparisons and consolidated quotations for tenders.", icon: "procurement", linkLabel: "", linkHref: "" },
          { title: "Supply & logistics", body: "Coordinated delivery for single items and complete projects.", icon: "delivery", linkLabel: "", linkHref: "" },
          { title: "Installation", body: "Installation, commissioning and user orientation with your teams.", icon: "installation", linkLabel: "", linkHref: "" },
          { title: "Documentation", body: "Brochures, datasheets and handover documentation.", icon: "documents", linkLabel: "", linkHref: "" },
          { title: "After-sales coordination", body: "Service coordination and support after handover.", icon: "support", linkLabel: "", linkHref: "" },
        ] }, design: { background: "pearl", columns: "3", cardStyle: "standard", spacing: "large" } },
        { type: "PROCESS_STEPS", content: { overline: "How we work", heading: "A clear path from requirement to installation.", intro: "", items: [
          { title: "Discover", body: "Share the department, clinical need and timeline." },
          { title: "Consult", body: "We review configurations and options with your team." },
          { title: "Select", body: "Finalise the equipment list and specifications." },
          { title: "Quote", body: "Receive a detailed quotation for your requirement." },
          { title: "Deliver", body: "Coordinated delivery, installation and commissioning." },
          { title: "Support", body: "Ongoing service coordination after handover." },
        ] }, design: { spacing: "large" } },
        { type: "RELATED_LOCATIONS", content: { overline: "Coverage", heading: "Working with institutions across India.", intro: "City pages for the places we serve most often.", highlight: "", ctaLabel: "All locations", ctaHref: "/locations" }, design: { background: "grid", spacing: "large" } },
        { type: "CTA", content: { overline: "Start a conversation", heading: "Planning a new department or an **upgrade**?", body: "Talk to our medical equipment team about your requirement.", primaryLabel: "Request a quote", primaryHref: "/rfq", secondaryLabel: "Contact us", secondaryHref: "/contact", image: "" }, design: { background: "dark", align: "left", spacing: "xl", container: "wide" } },
      ],
    },
    {
      slug: "support",
      title: "Service & support",
      sections: [
        { type: "HERO", content: { overline: "Service & support", heading: "Support that **lasts** / beyond installation", subheading: "Installation, user orientation, preventive maintenance coordination and service support for the equipment we supply — planned with your biomedical team.", primaryLabel: "Request service", primaryHref: "/contact", secondaryLabel: "Get a quote", secondaryHref: "/rfq", image: supportImage, note: "", points: [] }, design: { layout: "standard", background: "default", spacing: "large", container: "wide" } },
        { type: "ICON_CARDS", content: { overline: "What we cover", heading: "Service across the equipment **lifecycle**.", intro: "Scope and response terms are agreed for each installation and set out in your service agreement.", image: "", ctaLabel: "", ctaHref: "", items: [
          { title: "Installation & commissioning", body: "Site readiness checks, installation and commissioning with your team.", icon: "installation", linkLabel: "", linkHref: "" },
          { title: "User orientation", body: "Hands-on orientation for clinical and biomedical staff at handover.", icon: "training", linkLabel: "", linkHref: "" },
          { title: "Preventive maintenance", body: "Scheduled maintenance visits coordinated to keep equipment in service.", icon: "quality", linkLabel: "", linkHref: "" },
          { title: "Breakdown support", body: "Fault reporting and service coordination with the manufacturer's engineers.", icon: "support", linkLabel: "", linkHref: "" },
          { title: "Spares & accessories", body: "Help sourcing consumables, accessories and replacement parts.", icon: "delivery", linkLabel: "", linkHref: "" },
          { title: "Documentation", body: "Manuals, service records and handover documentation kept in order.", icon: "documents", linkLabel: "", linkHref: "" },
        ] }, design: { background: "pearl", columns: "3", cardStyle: "standard", spacing: "large", container: "wide" } },
        { type: "PROCESS_STEPS", content: { overline: "Raising a request", heading: "How a service request **works**.", intro: "", items: [
          { title: "Report", body: "Tell us the equipment, its location and what you are seeing." },
          { title: "Assess", body: "We review the issue and agree the next step with your team." },
          { title: "Resolve", body: "A visit, a part or a remote fix, coordinated to your schedule." },
          { title: "Record", body: "The work is documented against the equipment's service history." },
        ] }, design: { spacing: "large", container: "wide" } },
        { type: "FAQ", content: { overline: "Questions", heading: "Service questions.", intro: "", items: [
          { question: "Is installation included with the equipment?", answer: "Installation and commissioning are quoted with each system. The scope — site checks, mounting, utilities and orientation — is listed in the quotation." },
          { question: "Do you offer maintenance contracts?", answer: "Maintenance and service arrangements can be quoted for the equipment we supply. Coverage, visit frequency and response terms are set out in the agreement for each installation." },
          { question: "Can you help with equipment we did not supply?", answer: "Tell us the make and model. Where we can coordinate service or source parts we will say so; where we cannot, we will tell you." },
          { question: "How do I raise a service request?", answer: "Use the contact page or the details in your service agreement, with the equipment's serial number and a short description of the issue." },
        ] }, design: { layout: "split", spacing: "large", container: "wide" } },
        { type: "CTA", content: { overline: "Need support?", heading: "Talk to our **service** team.", body: "Share the equipment and the issue — we will come back to you with the next step.", primaryLabel: "Contact us", primaryHref: "/contact", secondaryLabel: "Browse equipment", secondaryHref: "/products", image: "" }, design: { background: "dark", align: "left", spacing: "xl", container: "wide" } },
      ],
    },
    { slug: "privacy", title: "Privacy policy", sections: [{ type: "RICH_TEXT", content: { heading: "Privacy policy", body: POLICY("Privacy policy") }, design: { container: "narrow", spacing: "large" } }] },
    { slug: "terms", title: "Terms of use", sections: [{ type: "RICH_TEXT", content: { heading: "Terms of use", body: POLICY("Terms of use").replace("handles information in connection with", "sets out the terms for using") }, design: { container: "narrow", spacing: "large" } }] },
  ];
  for (const page of pages) {
    if (await prisma.page.findUnique({ where: { slug: page.slug } })) continue;
    const row = await prisma.page.create({
      data: { slug: page.slug, title: page.title, ...live, sections: { create: sectionRows(page.sections) } },
      select: { id: true },
    });
    manifest.pages.push(row.id);
    created++;
  }

  // ---- homepage: the starter, built from what now exists, with imagery and
  // clearly labelled demonstration figures. Never replaces an existing one.
  if (!(await prisma.page.findUnique({ where: { slug: "home" } }))) {
    const heroObject = await image("hero/ct-scanner.webp", "general", "CT scanner with patient table");
    const statementImage = await scene("ot-b", "Operating theatre with anaesthesia workstation and surgical lights");
    const bandImage = await scene("ct-room", "CT imaging suite with scanner gantry and patient table");
    const ctaImage = await scene("icu-b", "Equipped intensive care bay");
    // The floating cards beside the hero: three products and their pictures.
    const heroCards = await prisma.product.findMany({
      where: { slug: { in: [slug("Biphasic Defibrillator"), slug("Digital X-Ray System"), slug("Colour Doppler Ultrasound System")] } },
      select: { name: true, slug: true, primaryImageId: true },
    });
    const cardOrder = [slug("Biphasic Defibrillator"), slug("Digital X-Ray System"), slug("Colour Doppler Ultrasound System")];
    const cardDetail: Record<string, string> = {
      [slug("Biphasic Defibrillator")]: "Fast response when every second counts.",
      [slug("Digital X-Ray System")]: "Clear imaging, efficient workflow.",
      [slug("Colour Doppler Ultrasound System")]: "Versatile imaging at the bedside.",
    };
    const starter = await starterHomeSections();
    const sections = starter.map((row) => {
      const content = { ...row.content } as Record<string, unknown>;
      const design = { ...row.design } as Record<string, unknown>;
      if (row.type === "HERO") {
        content.image = heroObject;
        content.points = cardOrder
          .map((key) => heroCards.find((product) => product.slug === key))
          .filter((product) => product !== undefined)
          .map((product) => ({
            title: product.name.replace("Colour Doppler ", "").replace(" System", ""),
            detail: cardDetail[product.slug] ?? "",
            image: product.primaryImageId ?? "",
            href: `/products/${product.slug}`,
          }));
      }
      if (row.type === "STATISTICS") {
        // DEMO FIGURES — indicative only, and labelled as such on the page.
        // Replace with verified figures in the CMS before launch.
        content.items = [
          { value: "500+", label: "Products & solutions", detail: "Configured to each requirement" },
          { value: "15+", label: "Years of team experience", detail: "In healthcare equipment supply" },
          { value: "Pan-India", label: "Supply & installation", detail: "Metros and regional centres" },
        ];
        content.image = statementImage;
        content.ctaLabel = "About us";
        content.ctaHref = "/about";
        content.note = "Indicative figures for demonstration — replace with verified figures in the CMS before launch.";
      }
      if (row.type === "CTA" && design.layout === "full") content.image = bandImage;
      else if (row.type === "CTA") content.image = ctaImage;
      return { type: row.type, content, design };
    });
    const home = await prisma.page.create({
      data: { slug: "home", title: "Homepage", ...live, sections: { create: sectionRows(sections) } },
      select: { id: true },
    });
    manifest.pages.push(home.id);
    created++;
  }

  // ---- header menu, only when empty
  const header = await prisma.navigationMenu.upsert({
    where: { key: "HEADER" },
    update: {},
    create: { key: "HEADER", name: "Main navigation", location: "HEADER", isSystem: true },
    select: { id: true, _count: { select: { items: true } } },
  });
  if (header._count.items === 0) {
    const items = [
      ["Home", "/"],
      ["Products", "/products"],
      ["Solutions", "/solutions"],
      ["About", "/about"],
      ["Support", "/support"],
      ["Contact", "/contact"],
    ];
    for (const [order, [label, href]] of items.entries()) {
      const row = await prisma.navigationItem.create({
        data: { menuId: header.id, label, href, order },
        select: { id: true },
      });
      manifest.menuItems.push(row.id);
    }
  }

  // ---- popup. Created switched off and never switched on here: a demo must
  // not put a dialog in front of visitors of a live site. Staff try it from
  // Popups in the admin.
  const keptPopup = manifest.popups.length
    ? await prisma.popup.findFirst({ where: { id: { in: manifest.popups }, deletedAt: null }, select: { id: true } })
    : null;
  if (!keptPopup) {
    const form = await prisma.form.findFirst({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const popup = await prisma.popup.create({
      data: {
        name: "Demo – ICU / OT project enquiry",
        type: form ? "ENQUIRY" : "ANNOUNCEMENT",
        active: false,
        eyebrow: "Project enquiry",
        heading: "Planning an ICU or OT upgrade?",
        description:
          "Share your equipment requirements and speak with our team about a suitable equipment shortlist.",
        imageId: await scene("icu", "Intensive care unit with patient monitoring at each bed"),
        formId: form?.id ?? null,
        ctaLabel: form ? null : "Discuss your requirement",
        ctaHref: form ? null : "/contact",
        trigger: "DELAY",
        delaySeconds: 12,
        device: "ALL",
        frequencyDays: 7,
        targetMode: "EXCLUDE",
        targetRules: ["/blog/*"],
        priority: 0,
      },
      select: { id: true },
    });
    manifest.popups.push(popup.id);
    created += 1;
  }

  // Demo content must not end up in search results.
  await prisma.setting.upsert({
    where: { key: "seo.noindex" },
    update: { value: "true" },
    create: {
      key: "seo.noindex",
      group: "seo",
      type: "BOOLEAN",
      label: "Ask search engines not to index this site",
      value: "true",
    },
  });

  await writeManifest(manifest);

  console.log(`Demo content ready: ${created} records added and published.`);
  console.log("Search engines are asked not to index the site while demo content is up (Settings → SEO).");
  console.log("Restart the application so cached pages are rebuilt. Remove later with: node ops/seed-demo.mjs --remove");
}

/* --------------------------------------------------------------- remove -- */

async function remove(): Promise<void> {
  const demo = { startsWith: PREFIX };
  const manifest = await readManifest();

  const products = await prisma.product.findMany({ where: { slug: demo }, select: { id: true } });
  const categories = await prisma.category.findMany({ where: { slug: demo }, select: { id: true } });
  await prisma.faq.deleteMany({
    where: {
      OR: [
        { entityType: "Product", entityId: { in: products.map((p) => p.id) } },
        { entityType: "Category", entityId: { in: categories.map((c) => c.id) } },
        { entityType: "City", entityId: { in: manifest.cities } },
      ],
    },
  });

  // Cities first (they link to catalogue rows), then products before the
  // categories that hold them, subcategories before their parents.
  const cities = await prisma.city.deleteMany({ where: { id: { in: manifest.cities } } });
  await prisma.state.deleteMany({ where: { id: { in: manifest.states }, cities: { none: {} } } });
  const removedProducts = await prisma.product.deleteMany({ where: { slug: demo } });
  const subcategories = await prisma.category.deleteMany({ where: { slug: demo, depth: 1 } });
  const parents = await prisma.category.deleteMany({ where: { slug: demo, depth: 0 } });
  const brands = await prisma.brand.deleteMany({ where: { slug: demo } });
  const specialties = await prisma.specialty.deleteMany({ where: { slug: demo } });
  const solutions = await prisma.solution.deleteMany({ where: { slug: demo } });
  const applications = await prisma.application.deleteMany({ where: { slug: demo } });
  const posts = await prisma.blogPost.deleteMany({ where: { slug: demo } });
  const pages = await prisma.page.deleteMany({
    where: {
      OR: [
        { id: { in: manifest.pages } },
        // The earlier seeder's pages, recognised by their title.
        { title: { startsWith: LEGACY_TITLE }, slug: { in: ["about", "privacy", "terms"] } },
      ],
    },
  });
  await prisma.navigationItem.deleteMany({ where: { id: { in: manifest.menuItems } } });
  // Only the popups this script created, by id: a popup staff made is never touched.
  const popups = await prisma.popup.deleteMany({ where: { id: { in: manifest.popups ?? [] } } });

  // Settings go back to what they were — unless someone has changed them since.
  for (const [key, previous] of Object.entries(manifest.settings)) {
    await prisma.setting.updateMany({ where: { key }, data: { value: previous } });
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { originalName: demo },
    select: { id: true, storageKey: true },
  });
  await prisma.mediaUsage.deleteMany({ where: { assetId: { in: assets.map((a) => a.id) } } });
  for (const asset of assets) {
    await fs.rm(resolveStoragePath(asset.storageKey), { force: true }).catch(() => {});
  }
  await prisma.mediaAsset.deleteMany({ where: { id: { in: assets.map((a) => a.id) } } });
  await prisma.setting.deleteMany({ where: { key: MANIFEST_KEY } });

  console.log(
    `Demo content removed: ${removedProducts.count} products, ${parents.count + subcategories.count} categories, ${brands.count} brands, ${specialties.count} specialties, ${solutions.count} solutions, ${applications.count} applications, ${posts.count} articles, ${cities.count} cities, ${pages.count} pages, ${popups.count} popups, ${assets.length} files.`,
  );
  console.log(
    'When the real content is in, switch off "Ask search engines not to index this site" in Settings → SEO, then restart the application.',
  );
}

const run = process.argv.includes("--remove") ? remove : add;
run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
