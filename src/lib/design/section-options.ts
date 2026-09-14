/**
 * The complete set of presentation choices the CMS may ever expose.
 *
 * These unions are the design guardrail: section editors pick from them, the
 * Section component is the only thing that translates them into styles, and no
 * arbitrary CSS is accepted from content editors at any point.
 */

export const SECTION_SPACING = ["compact", "normal", "large", "xl"] as const;
export const SECTION_CONTAINER = ["narrow", "standard", "wide", "full"] as const;
export const SECTION_BACKGROUND = [
  "default",
  "white",
  "light",
  "dark",
  "brand",
] as const;
export const SECTION_ALIGN = ["left", "center"] as const;
export const SECTION_COLUMNS = ["2", "3", "4"] as const;
export const CARD_STYLE = [
  "standard",
  "bordered",
  "elevated",
  "minimal",
] as const;
export const IMAGE_POSITION = ["left", "right"] as const;

export type SectionSpacing = (typeof SECTION_SPACING)[number];
export type SectionContainer = (typeof SECTION_CONTAINER)[number];
export type SectionBackground = (typeof SECTION_BACKGROUND)[number];
export type SectionAlign = (typeof SECTION_ALIGN)[number];
export type SectionColumns = (typeof SECTION_COLUMNS)[number];
export type CardStyle = (typeof CARD_STYLE)[number];
export type ImagePosition = (typeof IMAGE_POSITION)[number];

export type SectionDesign = {
  spacing: SectionSpacing;
  container: SectionContainer;
  background: SectionBackground;
  align?: SectionAlign;
  columns?: SectionColumns;
  cardStyle?: CardStyle;
  imagePosition?: ImagePosition;
  anchorId?: string;
};

/**
 * The fallback for every option. Complete rather than partial: the editor, the
 * renderer and new-section defaults all read it, so an option missing here
 * would be one where those three could disagree.
 */
export const DEFAULT_SECTION_DESIGN: SectionDesign = {
  spacing: "normal",
  container: "standard",
  background: "default",
  align: "left",
  columns: "3",
  cardStyle: "standard",
  imagePosition: "left",
};

/** Anchor IDs are author-supplied, so they are constrained to a safe shape. */
export const ANCHOR_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export function isValidAnchorId(value: string): boolean {
  return ANCHOR_ID_PATTERN.test(value);
}
