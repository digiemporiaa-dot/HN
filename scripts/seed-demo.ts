import "dotenv/config";

import type { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/server/db";

/**
 * Sample catalogue content for trying the site out.
 *
 *   node ops/seed-demo.mjs            # add the samples
 *   node ops/seed-demo.mjs --remove   # take every sample out again
 *
 * Everything is a draft: visible to staff in the admin and through Preview,
 * never to the public or to search engines. Every name says "Demo" and every
 * address starts with "demo-", so a sample cannot be mistaken for the real
 * catalogue and the removal touches nothing else.
 *
 * Deliberately generic. No brands, model numbers, prices, ratings, clients or
 * certifications: those are claims about a business, and only the business
 * can make them.
 */

const PREFIX = "demo-";
const NAME = (name: string) => `Demo – ${name}`;

type DemoProduct = { name: string; short: string; description: string };
type DemoSub = { name: string; products: DemoProduct[] };
type DemoCategory = { name: string; short: string; subs: DemoSub[] };

const CATALOGUE: DemoCategory[] = [
  {
    name: "Critical Care",
    short: "Equipment for intensive care and high-dependency units.",
    subs: [
      {
        name: "Patient Monitors",
        products: [
          {
            name: "Multi-parameter Patient Monitor",
            short:
              "Bedside monitoring of ECG, SpO2, NIBP, temperature and respiration.",
            description:
              "A bedside monitor for continuous observation of vital signs.\n\nTypical parameters include **ECG**, **SpO2**, **non-invasive blood pressure**, temperature and respiration, with alarms and trend review.\n\nThis is sample content. Replace it with the details of a product you supply.",
          },
          {
            name: "Central Monitoring Station",
            short: "Shows several bedside monitors on one screen at the nurses' station.",
            description:
              "A central station that collects readings from networked bedside monitors so staff can watch a ward from one place.\n\nThis is sample content. Replace it with the details of a product you supply.",
          },
        ],
      },
      {
        name: "Ventilators",
        products: [
          {
            name: "ICU Ventilator",
            short: "Invasive and non-invasive ventilation for adult and paediatric patients.",
            description:
              "An intensive care ventilator offering volume and pressure modes for invasive and non-invasive ventilation.\n\nThis is sample content. Replace it with the details of a product you supply.",
          },
          {
            name: "Transport Ventilator",
            short: "Compact ventilation during transfers within and between hospitals.",
            description:
              "A portable ventilator for moving ventilated patients between departments or facilities.\n\nThis is sample content. Replace it with the details of a product you supply.",
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
        products: [
          {
            name: "LED Surgical Light",
            short: "Shadow-free LED illumination for the operating field.",
            description:
              "A ceiling-mounted LED light that gives even, shadow-reduced illumination over the operating table.\n\nThis is sample content. Replace it with the details of a product you supply.",
          },
        ],
      },
      {
        name: "OT Tables",
        products: [
          {
            name: "Electro-hydraulic Operating Table",
            short: "Motorised positioning for general and speciality surgery.",
            description:
              "An operating table with powered height, tilt and section adjustment for common surgical positions.\n\nThis is sample content. Replace it with the details of a product you supply.",
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
        products: [
          {
            name: "ICU Bed",
            short: "Motorised bed with height, backrest and knee-rest adjustment.",
            description:
              "A motorised intensive care bed with side rails and adjustable sections for patient positioning.\n\nThis is sample content. Replace it with the details of a product you supply.",
          },
        ],
      },
      {
        name: "Trolleys",
        products: [
          {
            name: "Emergency Crash Cart",
            short: "Drawers and fittings for resuscitation equipment and medicines.",
            description:
              "A mobile cart that keeps resuscitation equipment and medicines organised and ready in an emergency.\n\nThis is sample content. Replace it with the details of a product you supply.",
          },
        ],
      },
    ],
  },
];

const SPECIALTIES = [
  { name: "Intensive Care", products: ["Multi-parameter Patient Monitor", "Central Monitoring Station", "ICU Ventilator", "ICU Bed"] },
  { name: "Surgery", products: ["LED Surgical Light", "Electro-hydraulic Operating Table"] },
  { name: "Emergency", products: ["Transport Ventilator", "Emergency Crash Cart"] },
];

const slug = (name: string) =>
  PREFIX +
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function add(): Promise<void> {
  const productIds = new Map<string, string>();
  let created = 0;

  for (const [order, category] of CATALOGUE.entries()) {
    const parentSlug = slug(category.name);
    const parent =
      (await prisma.category.findFirst({
        where: { slug: parentSlug, parentId: null },
        select: { id: true },
      })) ??
      (created++,
      await prisma.category.create({
        data: {
          slug: parentSlug,
          name: NAME(category.name),
          shortDescription: category.short,
          depth: 0,
          order,
          status: "DRAFT",
        },
        select: { id: true },
      }));

    for (const [subOrder, sub] of category.subs.entries()) {
      const subSlug = slug(sub.name);
      const child =
        (await prisma.category.findFirst({
          where: { slug: subSlug, parentId: parent.id },
          select: { id: true },
        })) ??
        (created++,
        await prisma.category.create({
          data: {
            slug: subSlug,
            name: NAME(sub.name),
            parentId: parent.id,
            depth: 1,
            order: subOrder,
            status: "DRAFT",
          },
          select: { id: true },
        }));

      for (const product of sub.products) {
        const productSlug = slug(product.name);
        const existing = await prisma.product.findUnique({
          where: { slug: productSlug },
          select: { id: true },
        });
        if (existing) {
          productIds.set(product.name, existing.id);
          continue;
        }
        const row = await prisma.product.create({
          data: {
            slug: productSlug,
            name: NAME(product.name),
            shortDescription: product.short,
            description: product.description,
            categoryId: child.id,
            status: "DRAFT",
          },
          select: { id: true },
        });
        productIds.set(product.name, row.id);
        created++;
      }
    }
  }

  for (const [order, specialty] of SPECIALTIES.entries()) {
    const specialtySlug = slug(specialty.name);
    const row =
      (await prisma.specialty.findUnique({
        where: { slug: specialtySlug },
        select: { id: true },
      })) ??
      (created++,
      await prisma.specialty.create({
        data: {
          slug: specialtySlug,
          name: NAME(specialty.name),
          order,
          status: "DRAFT",
        },
        select: { id: true },
      }));
    for (const name of specialty.products) {
      const productId = productIds.get(name);
      if (!productId) continue;
      await prisma.productSpecialty.upsert({
        where: { productId_specialtyId: { productId, specialtyId: row.id } },
        update: {},
        create: { productId, specialtyId: row.id },
      });
    }
  }

  const postSlug = slug("choosing a patient monitor");
  if (!(await prisma.blogPost.findUnique({ where: { slug: postSlug } }))) {
    await prisma.blogPost.create({
      data: {
        slug: postSlug,
        title: NAME("What to consider when choosing a patient monitor"),
        excerpt:
          "Sample article. Replace it with your own writing, or delete it.",
        status: "DRAFT",
        sections: {
          create: {
            type: "RICH_TEXT",
            order: 0,
            enabled: true,
            content: {
              body: "This is a sample article showing how a blog post looks.\n\nA post is written in sections, like a page: text, images, a video, an FAQ or related products.\n\nReplace this text with your own, or delete the post.",
            } as Prisma.InputJsonValue,
            design: { container: "narrow" } as Prisma.InputJsonValue,
          },
        },
      },
    });
    created++;
  }

  console.log(
    `Demo content ready: ${created} item${created === 1 ? "" : "s"} added (all drafts, every name starting "Demo –").`,
  );
  console.log(
    "Open them in the admin and use Preview to see them on the site. Remove with: node ops/seed-demo.mjs --remove",
  );
}

async function remove(): Promise<void> {
  const demo = { startsWith: PREFIX };
  // Products first: categories refuse to go while products are filed under
  // them, and subcategories before the categories that contain them.
  const products = await prisma.product.deleteMany({ where: { slug: demo } });
  const subcategories = await prisma.category.deleteMany({
    where: { slug: demo, depth: 1 },
  });
  const categories = await prisma.category.deleteMany({
    where: { slug: demo, depth: 0 },
  });
  const specialties = await prisma.specialty.deleteMany({
    where: { slug: demo },
  });
  const posts = await prisma.blogPost.deleteMany({ where: { slug: demo } });
  console.log(
    `Demo content removed: ${products.count} products, ${categories.count + subcategories.count} categories, ${specialties.count} specialties, ${posts.count} posts.`,
  );
}

const run = process.argv.includes("--remove") ? remove : add;
run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
