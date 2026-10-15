import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { HN_CATALOGUE } from "../scripts/catalogue/hn-catalogue";

const IMAGES = join(process.cwd(), "public/images/hn/catalogue");

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const products = HN_CATALOGUE.flatMap((category) => category.subs.flatMap((sub) => sub.products));

describe("HN Medical System catalogue data", () => {
  it("gives every product its own address", () => {
    const slugs = products.map((product) => slugify(product.name));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every subcategory its own address within its category", () => {
    for (const category of HN_CATALOGUE) {
      const slugs = category.subs.map((sub) => slugify(sub.name));
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("ships every picture it refers to", () => {
    const keys = [
      ...HN_CATALOGUE.map((category) => category.image),
      ...products.flatMap((product) => [product.image, ...(product.gallery ?? [])]),
    ];
    const missing = keys.filter((key) => !existsSync(join(IMAGES, `${key}.webp`)));
    expect(missing).toEqual([]);
  });

  it("lists codes or values for every product", () => {
    for (const product of products) {
      expect(product.short.length, product.name).toBeGreaterThan(0);
      expect(product.highlights.length, product.name).toBeGreaterThan(0);
      expect(product.specs.flatMap((group) => group.items).length, product.name).toBeGreaterThan(0);
    }
  });
});
