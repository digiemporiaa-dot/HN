import type { CtaKind } from "./kinds";

/**
 * Every built-in button that can be configured, by a stable identifier.
 *
 * Buttons are matched by these identifiers, never by their label: a label is
 * copy an editor changes, an identifier is a promise. An identifier, once
 * shipped, is never renamed or reused for a different button; a retired one is
 * removed from this list and any configuration still naming it simply stops
 * matching.
 */
export type CtaPlacement = {
  id: string;
  label: string;
  kind: CtaKind;
};

export const CTA_PLACEMENTS = [
  { id: "product.hero.quote", label: "Product page — Request a quotation (top)", kind: "REQUEST_QUOTATION" },
  { id: "product.sticky.quote", label: "Product page — Request quote (sticky bar)", kind: "REQUEST_QUOTATION" },
  { id: "product.closing.quote", label: "Product page — Request a quotation (closing panel)", kind: "REQUEST_QUOTATION" },
  { id: "product.hero.brochure", label: "Product page — Download brochure (top)", kind: "DOWNLOAD_BROCHURE" },
  { id: "product.documents.download", label: "Product page — Documents list", kind: "DOWNLOAD_BROCHURE" },
  { id: "header.quote-list", label: "Header — Quotation list", kind: "REQUEST_QUOTATION" },
  { id: "rfq.page", label: "Quotation page (/rfq)", kind: "REQUEST_QUOTATION" },
  { id: "cms.brochure.download", label: "Page builder — Brochure download section", kind: "DOWNLOAD_BROCHURE" },
  { id: "cms.cta.primary", label: "Page builder — Call to action, primary button", kind: "CUSTOM" },
  { id: "cms.cta.secondary", label: "Page builder — Call to action, secondary button", kind: "CUSTOM" },
] as const satisfies readonly CtaPlacement[];

export type CtaPlacementId = (typeof CTA_PLACEMENTS)[number]["id"];

const BY_ID = new Map<string, CtaPlacement>(CTA_PLACEMENTS.map((placement) => [placement.id, placement]));

export function placementById(id: string): CtaPlacement | undefined {
  return BY_ID.get(id);
}

export function isPlacementId(value: unknown): value is CtaPlacementId {
  return typeof value === "string" && BY_ID.has(value);
}

/**
 * Placements a configuration of this kind may take over. Page-builder buttons
 * declare their kind per button, so they accept any kind.
 */
export function placementsForKind(kind: CtaKind): CtaPlacement[] {
  return CTA_PLACEMENTS.filter((placement) => placement.kind === kind || placement.kind === "CUSTOM");
}
