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

/**
 * Demo content for the whole site, to see it populated before the real
 * catalogue and copy are ready.
 *
 *   node ops/seed-demo.mjs            # add and publish the demo content
 *   node ops/seed-demo.mjs --remove   # take all of it out again
 *
 * What it adds: categories and subcategories, products (with images and
 * FAQs), brands, specialties, solutions, applications, About / Privacy /
 * Terms pages, blog posts, and header and footer menus if those are empty.
 * The homepage builds itself from the published catalogue.
 *
 * How it stays honest on a live domain:
 *   - every name starts "Demo –", every image says DEMO, every address of a
 *     catalogue record or post starts "demo-";
 *   - no prices, ratings, reviews, clients, certifications, addresses or
 *     model numbers — those are claims only the business can make;
 *   - "Ask search engines not to index this site" is switched on, so none of
 *     it is indexed while it is up. Switch it off in Settings → SEO once the
 *     real content is in and the demo is removed.
 *
 * After adding or removing, restart the application in Coolify so cached
 * pages are rebuilt from the database.
 */

const PREFIX = "demo-";
const DEMO = "Demo – ";
const NAME = (name: string) => `${DEMO}${name}`;
const slug = (name: string) =>
  PREFIX +
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const SAMPLE_NOTE =
  "This is sample content. Replace it with your own, or remove all demo content with `node ops/seed-demo.mjs --remove`.";

/* ------------------------------------------------------------- the data -- */

type DemoProduct = { name: string; short: string; body: string };
type DemoSub = { name: string; short: string; products: DemoProduct[] };
type DemoCategory = { name: string; short: string; subs: DemoSub[] };

const CATALOGUE: DemoCategory[] = [
  {
    name: "Critical Care",
    short: "Equipment for intensive care and high-dependency units.",
    subs: [
      {
        name: "Patient Monitors",
        short: "Bedside and central monitoring of vital signs.",
        products: [
          {
            name: "Multi-parameter Patient Monitor",
            short: "Bedside monitoring of ECG, SpO2, NIBP, temperature and respiration.",
            body: "A bedside monitor for continuous observation of vital signs. Typical parameters include **ECG**, **SpO2**, **non-invasive blood pressure**, temperature and respiration, with alarms and trend review.",
          },
          {
            name: "Central Monitoring Station",
            short: "Several bedside monitors on one screen at the nurses' station.",
            body: "A central station that gathers readings from networked bedside monitors so a ward can be watched from one place.",
          },
        ],
      },
      {
        name: "Ventilators",
        short: "Invasive and non-invasive ventilation.",
        products: [
          {
            name: "ICU Ventilator",
            short: "Invasive and non-invasive ventilation for adult and paediatric patients.",
            body: "An intensive care ventilator offering volume and pressure modes for invasive and non-invasive ventilation.",
          },
          {
            name: "Transport Ventilator",
            short: "Compact ventilation during transfers.",
            body: "A portable ventilator for moving ventilated patients between departments or facilities.",
          },
        ],
      },
    ],
  },
  {
    name: "Operation Theatre",
    short: "Lights, tables and equipment for surgical suites.",
    subs: [
      {
        name: "OT Lights",
        short: "Illumination for the operating field.",
        products: [
          {
            name: "LED Surgical Light",
            short: "Even, shadow-reduced LED illumination over the operating table.",
            body: "A ceiling-mounted LED light giving even, shadow-reduced illumination over the operating field.",
          },
        ],
      },
      {
        name: "OT Tables",
        short: "Operating tables for general and speciality surgery.",
        products: [
          {
            name: "Electro-hydraulic Operating Table",
            short: "Powered height, tilt and section adjustment.",
            body: "An operating table with powered height, tilt and section adjustment for common surgical positions.",
          },
        ],
      },
    ],
  },
  {
    name: "Hospital Furniture",
    short: "Beds, trolleys and furniture for wards and departments.",
    subs: [
      {
        name: "Hospital Beds",
        short: "Beds for wards and intensive care.",
        products: [
          {
            name: "ICU Bed",
            short: "Motorised bed with height, backrest and knee-rest adjustment.",
            body: "A motorised intensive care bed with side rails and adjustable sections for patient positioning.",
          },
        ],
      },
      {
        name: "Trolleys",
        short: "Carts and trolleys for wards and emergency.",
        products: [
          {
            name: "Emergency Crash Cart",
            short: "Drawers for resuscitation equipment and medicines.",
            body: "A mobile cart that keeps resuscitation equipment and medicines organised and ready in an emergency.",
          },
        ],
      },
    ],
  },
];

const BRANDS = [
  { name: "Brand A", categories: ["Critical Care"], products: ["Multi-parameter Patient Monitor", "Central Monitoring Station", "ICU Ventilator", "Transport Ventilator"] },
  { name: "Brand B", categories: ["Operation Theatre", "Hospital Furniture"], products: ["LED Surgical Light", "Electro-hydraulic Operating Table", "ICU Bed", "Emergency Crash Cart"] },
];

const SPECIALTIES = [
  { name: "Intensive Care", categories: ["Critical Care", "Hospital Furniture"], products: ["Multi-parameter Patient Monitor", "Central Monitoring Station", "ICU Ventilator", "ICU Bed"] },
  { name: "Surgery", categories: ["Operation Theatre"], products: ["LED Surgical Light", "Electro-hydraulic Operating Table"] },
  { name: "Emergency", categories: ["Hospital Furniture"], products: ["Transport Ventilator", "Emergency Crash Cart"] },
];

const SOLUTIONS = [
  { name: "ICU Setup", short: "Equipping a new intensive care unit.", categories: ["Critical Care", "Hospital Furniture"], products: ["Multi-parameter Patient Monitor", "ICU Ventilator", "ICU Bed"] },
  { name: "Operation Theatre Setup", short: "Equipping a new operating theatre.", categories: ["Operation Theatre"], products: ["LED Surgical Light", "Electro-hydraulic Operating Table"] },
];

const APPLICATIONS = [
  { name: "Adult Care", products: ["Multi-parameter Patient Monitor", "ICU Ventilator", "ICU Bed"] },
  { name: "Patient Transfer", products: ["Transport Ventilator", "Emergency Crash Cart"] },
];

const FEATURED_PRODUCTS = new Set([
  "Multi-parameter Patient Monitor",
  "ICU Ventilator",
  "LED Surgical Light",
  "ICU Bed",
]);

const PRODUCT_FAQS = [
  {
    question: "How do I get a quotation?",
    answer:
      "Add the product to your quotation list and send the request, or use the enquiry form on this page. Every quotation is prepared for your requirement.",
  },
  {
    question: "Can I ask about several products at once?",
    answer:
      "Yes. Add each product to the quotation list and send them together in one request.",
  },
];

const POSTS = [
  {
    title: "What to consider when choosing a patient monitor",
    excerpt: "The questions worth settling before comparing patient monitors.",
    body: "This is a sample article showing how a blog post looks on the site.\n\nA post is written in sections, like a page: text, images, a video, an FAQ or related products.\n\nReplace this article with your own writing, or remove all demo content.",
  },
  {
    title: "Planning equipment for a new ICU",
    excerpt: "A sample article on planning the equipment list for an intensive care unit.",
    body: "This is a sample article.\n\nUse the blog for guidance that helps hospital teams plan and buy: checklists, explanations of equipment types, and answers to common questions.\n\nReplace this article with your own writing, or remove all demo content.",
  },
  {
    title: "Preparing a quotation request",
    excerpt: "A sample article on what to include when asking for a quotation.",
    body: "This is a sample article.\n\nA clear request — quantities, the department, any configuration or timeline — helps a supplier quote accurately.\n\nReplace this article with your own writing, or remove all demo content.",
  },
];

/* --------------------------------------------------------------- images -- */

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A placeholder picture: clearly a sample, never mistaken for a photo. */
function demoSvg(label: string, hue: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue},45%,92%)"/><stop offset="1" stop-color="hsl(${hue},40%,80%)"/>
  </linearGradient></defs>
  <rect width="1200" height="900" fill="url(#g)"/>
  <rect x="470" y="250" width="260" height="190" rx="24" fill="none" stroke="hsl(${hue},35%,45%)" stroke-width="14"/>
  <circle cx="600" cy="345" r="48" fill="none" stroke="hsl(${hue},35%,45%)" stroke-width="14"/>
  <text x="600" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="hsl(${hue},35%,28%)">DEMO IMAGE</text>
  <text x="600" y="625" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="hsl(${hue},30%,32%)">${escapeXml(label)}</text>
</svg>`;
}

let hue = 200;
async function demoImage(label: string, folder: StorageFolder): Promise<string> {
  const originalName = `${slug(label)}.svg`;
  const existing = await prisma.mediaAsset.findFirst({
    where: { originalName, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  hue = (hue + 37) % 360;
  const bytes = Buffer.from(demoSvg(label, hue), "utf8");
  const storageKey = buildStorageKey({ folder, extension: "svg" });
  const file = resolveStoragePath(storageKey);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { mode: 0o640 });

  const asset = await prisma.mediaAsset.create({
    data: {
      storageKey,
      originalName,
      mimeType: "image/svg+xml",
      kind: "VECTOR",
      sizeBytes: bytes.length,
      width: 1200,
      height: 900,
      title: NAME(label),
      altText: `Demo image: ${label}`,
    },
    select: { id: true },
  });
  return asset.id;
}

/* ------------------------------------------------------------- sections -- */

const json = (value: unknown) => value as Prisma.InputJsonValue;
const sectionRows = (
  rows: Array<{ type: string; content: object; design?: object }>,
) =>
  rows.map((row, order) => ({
    type: row.type as never,
    order,
    enabled: true,
    content: json(row.content),
    design: json({ ...DEFAULT_SECTION_DESIGN, ...row.design }),
  }));

const ABOUT_SECTIONS = sectionRows([
  {
    type: "HEADING_TEXT",
    content: {
      overline: "Demo page",
      heading: "About us",
      body: "This is a sample About page. Replace it with the company's own story: when it started, where it works and what it supplies.",
    },
  },
  {
    type: "ICON_CARDS",
    content: {
      heading: "What we do",
      intro: "Sample cards. Replace them with what the company actually does.",
      items: [
        { title: "Supply", body: "Equipment for hospitals, clinics and diagnostic centres.", linkLabel: "", linkHref: "" },
        { title: "Installation", body: "Setting up equipment where it will be used.", linkLabel: "", linkHref: "" },
        { title: "Service", body: "Support after installation.", linkLabel: "", linkHref: "" },
      ],
    },
    design: { background: "light", columns: "3" },
  },
  {
    type: "PROCESS_STEPS",
    content: {
      heading: "How a quotation works",
      intro: "",
      items: [
        { title: "Build a list", body: "Add products to the quotation list from the catalogue." },
        { title: "Send the request", body: "Tell us the quantities and anything about your requirement." },
        { title: "Receive a quotation", body: "We prepare a quotation for your requirement." },
      ],
    },
  },
  {
    type: "CTA",
    content: {
      heading: "Planning a new department or an upgrade?",
      body: "Build a list from the catalogue and send it in one request.",
      primaryLabel: "Browse the catalogue",
      primaryHref: "/products",
      secondaryLabel: "Contact us",
      secondaryHref: "/contact",
    },
    design: { background: "dark", align: "center" },
  },
]);

const policySections = (title: string) =>
  sectionRows([
    {
      type: "RICH_TEXT",
      content: {
        heading: title,
        body: `**Sample text — not a real ${title.toLowerCase()}.** Replace this page with your own policy, reviewed by your legal adviser, before relying on it.\n\nThis page shows how a policy page looks on the site: headings, paragraphs, **bold** text and [links](/contact).\n\n${SAMPLE_NOTE}`,
      },
      design: { container: "narrow" },
    },
  ]);

const PAGES = [
  { slug: "about", title: "About us", sections: ABOUT_SECTIONS },
  { slug: "privacy", title: "Privacy policy", sections: policySections("Privacy policy") },
  { slug: "terms", title: "Terms of use", sections: policySections("Terms of use") },
];

const HEADER_MENU = [
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Specialties", href: "/specialties" },
  { label: "Solutions", href: "/solutions" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const FOOTER_MENU = [
  {
    label: "Catalogue",
    children: [
      { label: "Products", href: "/products" },
      { label: "Categories", href: "/categories" },
      { label: "Brands", href: "/brands" },
      { label: "Specialties", href: "/specialties" },
    ],
  },
  {
    label: "Company",
    children: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

/* ------------------------------------------------------------------ add -- */

async function add(): Promise<void> {
  const now = new Date();
  const live = { status: "PUBLISHED" as const, publishedAt: now };
  const counts = { created: 0 };
  const bump = <T>(value: T) => {
    counts.created += 1;
    return value;
  };

  const categoryIds = new Map<string, string>();
  const productIds = new Map<string, string>();

  for (const [order, category] of CATALOGUE.entries()) {
    const parentSlug = slug(category.name);
    const parent =
      (await prisma.category.findFirst({
        where: { slug: parentSlug, parentId: null },
        select: { id: true },
      })) ??
      bump(
        await prisma.category.create({
          data: {
            slug: parentSlug,
            name: NAME(category.name),
            shortDescription: category.short,
            description: `${category.short}\n\n${SAMPLE_NOTE}`,
            imageId: await demoImage(category.name, "categories"),
            depth: 0,
            order,
            featured: true,
            ...live,
          },
          select: { id: true },
        }),
      );
    categoryIds.set(category.name, parent.id);

    for (const [subOrder, sub] of category.subs.entries()) {
      const subSlug = slug(sub.name);
      const child =
        (await prisma.category.findFirst({
          where: { slug: subSlug, parentId: parent.id },
          select: { id: true },
        })) ??
        bump(
          await prisma.category.create({
            data: {
              slug: subSlug,
              name: NAME(sub.name),
              shortDescription: sub.short,
              imageId: await demoImage(sub.name, "categories"),
              parentId: parent.id,
              depth: 1,
              order: subOrder,
              ...live,
            },
            select: { id: true },
          }),
        );

      for (const [productOrder, product] of sub.products.entries()) {
        const productSlug = slug(product.name);
        const existing = await prisma.product.findUnique({
          where: { slug: productSlug },
          select: { id: true },
        });
        if (existing) {
          productIds.set(product.name, existing.id);
          continue;
        }
        const row = bump(
          await prisma.product.create({
            data: {
              slug: productSlug,
              name: NAME(product.name),
              shortDescription: product.short,
              description: `${product.body}\n\n${SAMPLE_NOTE}`,
              categoryId: child.id,
              primaryImageId: await demoImage(product.name, "products"),
              featured: FEATURED_PRODUCTS.has(product.name),
              order: productOrder,
              ...live,
            },
            select: { id: true },
          }),
        );
        productIds.set(product.name, row.id);
        await prisma.faq.createMany({
          data: PRODUCT_FAQS.map((faq, faqOrder) => ({
            entityType: "Product",
            entityId: row.id,
            question: faq.question,
            answer: faq.answer,
            order: faqOrder,
          })),
        });
      }
    }
  }

  const ids = (names: string[], from: Map<string, string>) =>
    names.map((name) => from.get(name)).filter((id): id is string => !!id);

  for (const [order, brand] of BRANDS.entries()) {
    const brandSlug = slug(brand.name);
    let row = await prisma.brand.findUnique({
      where: { slug: brandSlug },
      select: { id: true },
    });
    if (!row) {
      row = bump(
        await prisma.brand.create({
          data: {
            slug: brandSlug,
            name: NAME(brand.name),
            shortDescription: "A sample brand. Replace with the manufacturers you actually supply.",
            logoId: await demoImage(brand.name, "brands"),
            order,
            featured: true,
            ...live,
          },
          select: { id: true },
        }),
      );
      await prisma.brandCategory.createMany({
        data: ids(brand.categories, categoryIds).map((categoryId) => ({
          brandId: row!.id,
          categoryId,
        })),
        skipDuplicates: true,
      });
    }
    await prisma.product.updateMany({
      where: { id: { in: ids(brand.products, productIds) } },
      data: { brandId: row.id },
    });
  }

  for (const [order, specialty] of SPECIALTIES.entries()) {
    const specialtySlug = slug(specialty.name);
    const row =
      (await prisma.specialty.findUnique({
        where: { slug: specialtySlug },
        select: { id: true },
      })) ??
      bump(
        await prisma.specialty.create({
          data: {
            slug: specialtySlug,
            name: NAME(specialty.name),
            shortDescription: `Sample specialty: equipment for ${specialty.name.toLowerCase()}.`,
            imageId: await demoImage(specialty.name, "general"),
            order,
            featured: true,
            ...live,
          },
          select: { id: true },
        }),
      );
    await prisma.productSpecialty.createMany({
      data: ids(specialty.products, productIds).map((productId) => ({
        productId,
        specialtyId: row.id,
      })),
      skipDuplicates: true,
    });
    await prisma.categorySpecialty.createMany({
      data: ids(specialty.categories, categoryIds).map((categoryId) => ({
        categoryId,
        specialtyId: row.id,
      })),
      skipDuplicates: true,
    });
  }

  for (const [order, solution] of SOLUTIONS.entries()) {
    const solutionSlug = slug(solution.name);
    const row =
      (await prisma.solution.findUnique({
        where: { slug: solutionSlug },
        select: { id: true },
      })) ??
      bump(
        await prisma.solution.create({
          data: {
            slug: solutionSlug,
            name: NAME(solution.name),
            shortDescription: solution.short,
            description: `${solution.short}\n\n${SAMPLE_NOTE}`,
            imageId: await demoImage(solution.name, "general"),
            order,
            ...live,
          },
          select: { id: true },
        }),
      );
    await prisma.productSolution.createMany({
      data: ids(solution.products, productIds).map((productId) => ({
        productId,
        solutionId: row.id,
      })),
      skipDuplicates: true,
    });
    await prisma.solutionCategory.createMany({
      data: ids(solution.categories, categoryIds).map((categoryId) => ({
        solutionId: row.id,
        categoryId,
      })),
      skipDuplicates: true,
    });
  }

  for (const application of APPLICATIONS) {
    const applicationSlug = slug(application.name);
    const row =
      (await prisma.application.findUnique({
        where: { slug: applicationSlug },
        select: { id: true },
      })) ??
      bump(
        await prisma.application.create({
          data: { slug: applicationSlug, name: NAME(application.name) },
          select: { id: true },
        }),
      );
    await prisma.productApplication.createMany({
      data: ids(application.products, productIds).map((productId) => ({
        productId,
        applicationId: row.id,
      })),
      skipDuplicates: true,
    });
  }

  // Pages keep their real addresses (/about, /privacy, /terms), so they are
  // recognised as demo by their title. A page that already exists at one of
  // these addresses is left alone.
  for (const page of PAGES) {
    if (await prisma.page.findUnique({ where: { slug: page.slug } })) continue;
    bump(
      await prisma.page.create({
        data: {
          slug: page.slug,
          title: NAME(page.title),
          ...live,
          sections: { create: page.sections },
        },
      }),
    );
  }

  for (const [index, post] of POSTS.entries()) {
    const postSlug = slug(post.title);
    if (await prisma.blogPost.findUnique({ where: { slug: postSlug } })) continue;
    bump(
      await prisma.blogPost.create({
        data: {
          slug: postSlug,
          title: NAME(post.title),
          excerpt: post.excerpt,
          authorName: "Demo author",
          coverId: await demoImage(post.title, "blogs"),
          featured: index === 0,
          status: "PUBLISHED",
          // A day apart, so the index has an order to show.
          publishedAt: new Date(now.getTime() - index * 86_400_000),
          sections: {
            create: sectionRows([
              { type: "RICH_TEXT", content: { body: post.body }, design: { container: "narrow" } },
            ]),
          },
        },
      }),
    );
  }

  // Menus: only filled when empty, so a menu someone has set up is kept.
  for (const menu of [
    { key: "HEADER", name: "Main navigation", location: "HEADER" as const },
    { key: "FOOTER", name: "Footer columns", location: "FOOTER" as const },
  ]) {
    const row = await prisma.navigationMenu.upsert({
      where: { key: menu.key },
      update: {},
      create: { ...menu, isSystem: true },
      select: { id: true, _count: { select: { items: true } } },
    });
    if (row._count.items > 0) continue;
    if (menu.key === "HEADER") {
      await prisma.navigationItem.createMany({
        data: HEADER_MENU.map((item, order) => ({
          menuId: row.id,
          label: item.label,
          href: item.href,
          order,
        })),
      });
    } else {
      for (const [order, column] of FOOTER_MENU.entries()) {
        const parent = await prisma.navigationItem.create({
          data: { menuId: row.id, label: column.label, order },
          select: { id: true },
        });
        await prisma.navigationItem.createMany({
          data: column.children.map((item, childOrder) => ({
            menuId: row.id,
            parentId: parent.id,
            label: item.label,
            href: item.href,
            order: childOrder,
            depth: 1,
          })),
        });
      }
    }
    counts.created += 1;
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

  console.log(`Demo content ready: ${counts.created} items added and published.`);
  console.log(
    "Search engines are asked not to index the site while demo content is up (Settings → SEO).",
  );
  console.log(
    "Restart the application in Coolify so cached pages are rebuilt. Remove later with: node ops/seed-demo.mjs --remove",
  );
}

/* --------------------------------------------------------------- remove -- */

async function remove(): Promise<void> {
  const demo = { startsWith: PREFIX };

  const demoProducts = await prisma.product.findMany({
    where: { slug: demo },
    select: { id: true },
  });
  await prisma.faq.deleteMany({
    where: { entityType: "Product", entityId: { in: demoProducts.map((p) => p.id) } },
  });
  // Products first: categories refuse to go while products are filed under
  // them, and subcategories before the categories that contain them.
  const products = await prisma.product.deleteMany({ where: { slug: demo } });
  const subcategories = await prisma.category.deleteMany({
    where: { slug: demo, depth: 1 },
  });
  const categories = await prisma.category.deleteMany({
    where: { slug: demo, depth: 0 },
  });
  const brands = await prisma.brand.deleteMany({ where: { slug: demo } });
  const specialties = await prisma.specialty.deleteMany({ where: { slug: demo } });
  const solutions = await prisma.solution.deleteMany({ where: { slug: demo } });
  const applications = await prisma.application.deleteMany({ where: { slug: demo } });
  const posts = await prisma.blogPost.deleteMany({ where: { slug: demo } });
  const pages = await prisma.page.deleteMany({
    where: { title: { startsWith: DEMO }, slug: { in: PAGES.map((p) => p.slug) } },
  });

  // Menu links to pages that no longer exist would lead nowhere.
  if (pages.count > 0) {
    await prisma.navigationItem.deleteMany({
      where: { href: { in: ["/about"] }, label: "About" },
    });
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { originalName: demo },
    select: { id: true, storageKey: true },
  });
  for (const asset of assets) {
    await fs.rm(resolveStoragePath(asset.storageKey), { force: true }).catch(() => {});
  }
  await prisma.mediaAsset.deleteMany({
    where: { id: { in: assets.map((a) => a.id) } },
  });

  console.log(
    `Demo content removed: ${products.count} products, ${categories.count + subcategories.count} categories, ${brands.count} brands, ${specialties.count} specialties, ${solutions.count} solutions, ${applications.count} applications, ${posts.count} posts, ${pages.count} pages, ${assets.length} images.`,
  );
  console.log(
    "Menus were kept. When the real content is in, switch off \"Ask search engines not to index this site\" in Settings → SEO, then restart the application in Coolify.",
  );
}

const run = process.argv.includes("--remove") ? remove : add;
run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
