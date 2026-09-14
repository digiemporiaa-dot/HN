import type { SectionType } from "@/generated/prisma/enums";

import { buildContentSchema, buildDefaults, type FieldSpec } from "./fields";
import {
  DEFAULT_SECTION_DESIGN,
  type SectionDesign,
} from "@/lib/design/section-options";

export type SectionDefinition = {
  type: SectionType;
  label: string;
  description: string;
  fields: FieldSpec[];
  /** Design options this section actually honours, so the editor shows no dead controls. */
  designOptions: Array<keyof SectionDesign>;
  design?: Partial<SectionDesign>;
};

const BASE_DESIGN: Array<keyof SectionDesign> = [
  "spacing",
  "container",
  "background",
  "anchorId",
];

/**
 * The section types implemented so far.
 *
 * The remaining types in the specification are mostly grids over catalogue
 * entities — products, categories, brands — which cannot be built before those
 * entities exist. They are added by the phases that introduce them.
 */
export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    type: "HERO",
    label: "Hero",
    description: "Large opening statement with an optional image and actions.",
    designOptions: [...BASE_DESIGN, "align"],
    design: { spacing: "xl", background: "light" },
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", required: true, maxLength: 160 },
      { kind: "textarea", name: "subheading", label: "Subheading", maxLength: 400, rows: 3 },
      { kind: "text", name: "primaryLabel", label: "Primary button label", maxLength: 40 },
      { kind: "url", name: "primaryHref", label: "Primary button link" },
      { kind: "text", name: "secondaryLabel", label: "Secondary button label", maxLength: 40 },
      { kind: "url", name: "secondaryHref", label: "Secondary button link" },
      { kind: "media", name: "image", label: "Image" },
    ],
  },
  {
    type: "HEADING_TEXT",
    label: "Heading and text",
    description: "A section heading with supporting copy.",
    designOptions: [...BASE_DESIGN, "align"],
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", required: true, maxLength: 160 },
      { kind: "textarea", name: "body", label: "Body", maxLength: 600, rows: 4 },
    ],
  },
  {
    type: "RICH_TEXT",
    label: "Rich text",
    description: "Long-form copy for policies, guidance and detailed content.",
    designOptions: [...BASE_DESIGN],
    design: { container: "narrow" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "richtext",
        name: "body",
        label: "Content",
        required: true,
        maxLength: 20000,
        help: "Blank lines start a new paragraph. **bold**, *italic* and [links](/path) are supported.",
      },
    ],
  },
  {
    type: "IMAGE_TEXT",
    label: "Image and text",
    description: "An image beside a block of copy.",
    designOptions: [...BASE_DESIGN, "imagePosition"],
    fields: [
      { kind: "media", name: "image", label: "Image", required: true },
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", required: true, maxLength: 160 },
      { kind: "richtext", name: "body", label: "Body", maxLength: 3000 },
      { kind: "text", name: "ctaLabel", label: "Button label", maxLength: 40 },
      { kind: "url", name: "ctaHref", label: "Button link" },
    ],
  },
  {
    type: "STATISTICS",
    label: "Statistics",
    description: "A row of figures. Only use numbers the company can evidence.",
    designOptions: [...BASE_DESIGN, "columns"],
    design: { background: "brand" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "repeater",
        name: "items",
        label: "Figures",
        itemLabel: "Figure",
        max: 6,
        min: 3,
        fields: [
          { kind: "text", name: "value", label: "Value", required: true, maxLength: 20 },
          { kind: "text", name: "label", label: "Label", required: true, maxLength: 60 },
        ],
      },
    ],
  },
  {
    type: "ICON_CARDS",
    label: "Feature cards",
    description: "A grid of short value propositions.",
    designOptions: [...BASE_DESIGN, "columns", "cardStyle"],
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      { kind: "textarea", name: "intro", label: "Intro", maxLength: 400, rows: 3 },
      {
        kind: "repeater",
        name: "items",
        label: "Cards",
        itemLabel: "Card",
        max: 8,
        min: 3,
        fields: [
          { kind: "text", name: "title", label: "Title", required: true, maxLength: 80 },
          { kind: "textarea", name: "body", label: "Body", maxLength: 300, rows: 2 },
        ],
      },
    ],
  },
  {
    type: "FAQ",
    label: "FAQ",
    description: "Questions and answers in an accordion.",
    designOptions: [...BASE_DESIGN],
    design: { container: "narrow" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "repeater",
        name: "items",
        label: "Questions",
        itemLabel: "Question",
        max: 20,
        min: 2,
        fields: [
          { kind: "text", name: "question", label: "Question", required: true, maxLength: 200 },
          { kind: "richtext", name: "answer", label: "Answer", required: true, maxLength: 2000 },
        ],
      },
    ],
  },
  {
    type: "CTA",
    label: "Call to action",
    description: "A closing prompt to request a quote or get in touch.",
    designOptions: [...BASE_DESIGN, "align"],
    design: { background: "dark", align: "center" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", required: true, maxLength: 160 },
      { kind: "textarea", name: "body", label: "Body", maxLength: 400, rows: 3 },
      { kind: "text", name: "primaryLabel", label: "Primary button label", maxLength: 40 },
      { kind: "url", name: "primaryHref", label: "Primary button link" },
      { kind: "text", name: "secondaryLabel", label: "Secondary button label", maxLength: 40 },
      { kind: "url", name: "secondaryHref", label: "Secondary button link" },
    ],
  },
];

export const SECTION_DEFINITIONS_BY_TYPE = new Map(
  SECTION_DEFINITIONS.map((definition) => [definition.type, definition]),
);

export function getSectionDefinition(type: string): SectionDefinition | null {
  return SECTION_DEFINITIONS_BY_TYPE.get(type as SectionType) ?? null;
}

export function contentSchemaFor(type: string) {
  const definition = getSectionDefinition(type);
  return definition ? buildContentSchema(definition.fields) : null;
}

export function defaultsFor(type: string): {
  content: Record<string, unknown>;
  design: SectionDesign;
} | null {
  const definition = getSectionDefinition(type);
  if (!definition) return null;

  return {
    content: buildDefaults(definition.fields),
    design: { ...DEFAULT_SECTION_DESIGN, ...definition.design },
  };
}
