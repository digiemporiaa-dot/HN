/**
 * The catalogue records a section can point at.
 *
 * Kept in its own module because the field specifications, the editor's picker
 * and the public resolver all need it, and the first two must not have to
 * import the database layer to know what kinds exist.
 */
export const ENTITY_KINDS = [
  "product",
  "category",
  "subcategory",
  "brand",
  "specialty",
] as const;

export type EntityKind = (typeof ENTITY_KINDS)[number];

export const ENTITY_LABELS: Record<EntityKind, { one: string; many: string }> =
  {
    product: { one: "product", many: "products" },
    category: { one: "category", many: "categories" },
    subcategory: { one: "subcategory", many: "subcategories" },
    brand: { one: "brand", many: "brands" },
    specialty: { one: "specialty", many: "specialties" },
  };
