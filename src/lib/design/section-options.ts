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
  "pearl",
  "gradient",
  "grid",
  "glow",
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
  "overlay",
] as const;
export const IMAGE_POSITION = ["left", "right"] as const;
/**
 * How a section arranges its content. Each section honours the subset that
 * makes sense for it and treats anything else as "standard", so a stored value
 * can never produce a broken layout.
 */
export const SECTION_LAYOUT = [
  "standard",
  "split",
  "editorial",
  "bento",
  "full",
] as const;

export type SectionSpacing = (typeof SECTION_SPACING)[number];
export type SectionContainer = (typeof SECTION_CONTAINER)[number];
export type SectionBackground = (typeof SECTION_BACKGROUND)[number];
export type SectionAlign = (typeof SECTION_ALIGN)[number];
export type SectionColumns = (typeof SECTION_COLUMNS)[number];
export type CardStyle = (typeof CARD_STYLE)[number];
export type ImagePosition = (typeof IMAGE_POSITION)[number];
export type SectionLayout = (typeof SECTION_LAYOUT)[number];

export type SectionDesign = {
  spacing: SectionSpacing;
  container: SectionContainer;
  background: SectionBackground;
  align?: SectionAlign;
  columns?: SectionColumns;
  cardStyle?: CardStyle;
  imagePosition?: ImagePosition;
  layout?: SectionLayout;
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
  layout: "standard",
};

/** Human labels for the editor. Values stay stable; labels can change. */
export const DESIGN_CHOICE_LABELS: Record<string, string> = {
  compact: "Compact",
  normal: "Standard",
  large: "Large",
  xl: "Hero",
  narrow: "Narrow",
  standard: "Standard",
  wide: "Wide",
  full: "Full width",
  default: "Default (white)",
  white: "Pure white",
  light: "Light grey",
  pearl: "Pearl",
  gradient: "Soft clinical gradient",
  grid: "Technical grid",
  glow: "Soft radial glow",
  dark: "Deep navy",
  brand: "Brand navy",
  left: "Left",
  center: "Centre",
  right: "Right",
  bordered: "Bordered",
  elevated: "Elevated",
  minimal: "Minimal",
  overlay: "Image overlay",
  split: "Split",
  editorial: "Editorial",
  bento: "Bento",
};

/** Anchor IDs are author-supplied, so they are constrained to a safe shape. */
export const ANCHOR_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export function isValidAnchorId(value: string): boolean {
  return ANCHOR_ID_PATTERN.test(value);
}
