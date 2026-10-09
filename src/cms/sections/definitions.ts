import type { SectionType } from "@/generated/prisma/enums";

import type { EntityKind } from "./entity-kinds";

import { buildContentSchema, buildDefaults, type FieldSpec } from "./fields";
import {
  DEFAULT_SECTION_DESIGN,
  type SectionDesign,
} from "@/lib/design/section-options";
import { FEATURE_ICON_OPTIONS } from "@/lib/design/icon-options";

export type SectionDefinition = {
  type: SectionType;
  label: string;
  description: string;
  fields: FieldSpec[];
  /** Design options this section actually honours, so the editor shows no dead controls. */
  designOptions: Array<keyof SectionDesign>;
  design?: Partial<SectionDesign>;
};

/**
 * What a call-to-action button does, besides following its link: open one of
 * the configurable popups. The configuration and the popup-or-direct choice
 * are per button; the product the buttons act on is shared by the section.
 */
const CTA_ACTION_OPTIONS = [
  { value: "LINK", label: "Follow the link" },
  { value: "REQUEST_QUOTATION", label: "Request quotation" },
  { value: "DOWNLOAD_BROCHURE", label: "Download brochure" },
  { value: "DOWNLOAD_CATALOGUE", label: "Download catalogue" },
  { value: "CONTACT_US", label: "Contact us" },
  { value: "GET_PRICE", label: "Get price" },
  { value: "REQUEST_DEMO", label: "Request a demo" },
  { value: "ENQUIRE_NOW", label: "Enquire now" },
  { value: "CUSTOM", label: "Custom popup" },
];

function ctaButtonFields(prefix: "primary" | "secondary", label: string): FieldSpec[] {
  return [
    {
      kind: "select",
      name: `${prefix}Action`,
      label: `${label} button action`,
      help: "Anything but Follow the link opens a popup configured under Content › CTA popups. The link stays the fallback.",
      options: CTA_ACTION_OPTIONS,
    },
    {
      kind: "ctaConfig",
      name: `${prefix}Config`,
      label: `${label} button popup configuration`,
      actionField: `${prefix}Action`,
    },
    {
      kind: "select",
      name: `${prefix}Mode`,
      label: `${label} button behaviour`,
      help: "A gated document always asks for details first, whatever is chosen here.",
      options: [
        { value: "AUTO", label: "As the configuration says" },
        { value: "POPUP", label: "Open the popup before acting" },
        { value: "DIRECT", label: "Act straight away, no popup" },
      ],
    },
  ];
}

const BASE_DESIGN: Array<keyof SectionDesign> = [
  "spacing",
  "container",
  "background",
  "anchorId",
];

/**
 * A grid over catalogue records.
 *
 * Every one of these sections is the same idea — a heading, some copy and an
 * ordered selection — differing only in which table it points at and what the
 * cards should say, so they are produced rather than written five times.
 */
function catalogueGrid(options: {
  type: SectionType;
  label: string;
  description: string;
  entity: EntityKind;
  fieldLabel: string;
  help: string;
  max?: number;
  design?: Partial<SectionDesign>;
}): SectionDefinition {
  return {
    type: options.type,
    label: options.label,
    description: options.description,
    design: options.design,
    designOptions: [...BASE_DESIGN, "layout", "columns", "cardStyle"],
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 400,
        rows: 3,
      },
      {
        kind: "entities",
        name: "items",
        label: options.fieldLabel,
        entity: options.entity,
        help: options.help,
        max: options.max ?? 24,
      },
      { kind: "text", name: "ctaLabel", label: "Link label", maxLength: 40 },
      { kind: "url", name: "ctaHref", label: "Link" },
    ],
  };
}

/**
 * The section types implemented so far.
 *
 * The remaining types in the specification are content-only variations on the
 * repeater — cards, timelines, tabs, tables — and the form block, which waits
 * on the forms module.
 */
export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    type: "HERO",
    label: "Hero",
    description:
      "Large opening statement with actions. Editorial layout: a showcase stage with one piece of equipment, floating product cards and a figure. Full width layout: a cinematic full-bleed photograph.",
    designOptions: [...BASE_DESIGN, "align", "layout"],
    design: { spacing: "compact", container: "wide", background: "default", layout: "editorial" },
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      {
        kind: "text",
        name: "heading",
        label: "Heading",
        required: true,
        maxLength: 160,
        help: "Wrap words in **double asterisks** to set them bold; \" / \" starts a new line, e.g. \"**Precision** equipment / designed for **care**\".",
      },
      {
        kind: "textarea",
        name: "subheading",
        label: "Subheading",
        maxLength: 400,
        rows: 3,
      },
      {
        kind: "text",
        name: "primaryLabel",
        label: "Primary button label",
        maxLength: 40,
      },
      { kind: "url", name: "primaryHref", label: "Primary button link" },
      {
        kind: "text",
        name: "secondaryLabel",
        label: "Secondary button label",
        maxLength: 40,
      },
      { kind: "url", name: "secondaryHref", label: "Secondary button link" },
      { kind: "media", name: "image", label: "Image" },
      {
        kind: "text",
        name: "note",
        label: "Trust line",
        maxLength: 140,
        help: "A short line under the buttons, e.g. who you serve. Avoid claims you cannot evidence.",
      },
      {
        kind: "repeater",
        name: "points",
        label: "Highlights",
        itemLabel: "Highlight",
        help: "Optional. Editorial layout: the first three become floating product cards beside the stage (add an image and a link). Full width layout: up to four points along the bottom.",
        max: 4,
        fields: [
          {
            kind: "text",
            name: "title",
            label: "Title",
            required: true,
            maxLength: 60,
          },
          { kind: "text", name: "detail", label: "Detail", maxLength: 90 },
          { kind: "media", name: "image", label: "Image (cut-out works best)" },
          { kind: "url", name: "href", label: "Link" },
        ],
      },
      {
        kind: "text",
        name: "statValue",
        label: "Figure",
        maxLength: 16,
        help: "Editorial layout only, e.g. \"500+\". Use a figure you can evidence.",
      },
      { kind: "text", name: "statLabel", label: "Figure label", maxLength: 60 },
      {
        kind: "textarea",
        name: "statDetail",
        label: "Figure note",
        maxLength: 200,
        rows: 2,
      },
    ],
  },
  {
    type: "HEADING_TEXT",
    label: "Heading and text",
    description: "A section heading with supporting copy.",
    designOptions: [...BASE_DESIGN, "align", "layout"],
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      {
        kind: "text",
        name: "heading",
        label: "Heading",
        required: true,
        maxLength: 160,
      },
      {
        kind: "textarea",
        name: "body",
        label: "Body",
        maxLength: 600,
        rows: 4,
      },
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
    designOptions: [...BASE_DESIGN, "imagePosition", "layout"],
    fields: [
      { kind: "media", name: "image", label: "Image", required: true },
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      {
        kind: "text",
        name: "heading",
        label: "Heading",
        required: true,
        maxLength: 160,
      },
      { kind: "richtext", name: "body", label: "Body", maxLength: 3000 },
      {
        kind: "repeater",
        name: "points",
        label: "Key points",
        itemLabel: "Point",
        help: "Optional checklist shown under the copy.",
        max: 6,
        fields: [
          {
            kind: "text",
            name: "title",
            label: "Point",
            required: true,
            maxLength: 120,
          },
        ],
      },
      { kind: "text", name: "ctaLabel", label: "Button label", maxLength: 40 },
      { kind: "url", name: "ctaHref", label: "Button link" },
    ],
  },
  {
    type: "STATISTICS",
    label: "Statistics",
    description:
      "A row of figures. The Bento layout sets a statement beside grey, cyan and black figure tiles and a photograph. Only use numbers the company can evidence.",
    designOptions: [...BASE_DESIGN, "columns", "layout"],
    design: { background: "dark", columns: "4" },
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 200 },
      { kind: "textarea", name: "intro", label: "Intro", maxLength: 400, rows: 2 },
      {
        kind: "text",
        name: "note",
        label: "Footnote",
        maxLength: 200,
        help: "Shown in small print under the figures, e.g. how they are counted.",
      },
      { kind: "media", name: "image", label: "Image (Bento layout)" },
      { kind: "text", name: "ctaLabel", label: "Link label", maxLength: 40 },
      { kind: "url", name: "ctaHref", label: "Link" },
      {
        kind: "repeater",
        name: "items",
        label: "Figures",
        itemLabel: "Figure",
        max: 6,
        min: 3,
        fields: [
          {
            kind: "text",
            name: "value",
            label: "Value",
            required: true,
            maxLength: 20,
          },
          {
            kind: "text",
            name: "label",
            label: "Label",
            required: true,
            maxLength: 60,
          },
          { kind: "text", name: "detail", label: "Detail", maxLength: 120 },
        ],
      },
    ],
  },
  {
    type: "ICON_CARDS",
    label: "Feature cards",
    description:
      "Short value propositions. The Split and Editorial layouts set them beside an image as a numbered list.",
    designOptions: [...BASE_DESIGN, "layout", "columns", "cardStyle", "imagePosition"],
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 400,
        rows: 3,
      },
      {
        kind: "media",
        name: "image",
        label: "Image",
        help: "Used by the Split and Editorial layouts.",
      },
      { kind: "text", name: "ctaLabel", label: "Button label", maxLength: 40 },
      { kind: "url", name: "ctaHref", label: "Button link" },
      {
        kind: "repeater",
        name: "items",
        label: "Cards",
        itemLabel: "Card",
        max: 8,
        min: 3,
        fields: [
          {
            kind: "text",
            name: "title",
            label: "Title",
            required: true,
            maxLength: 80,
          },
          {
            kind: "textarea",
            name: "body",
            label: "Body",
            maxLength: 300,
            rows: 2,
          },
          {
            kind: "select",
            name: "icon",
            label: "Icon",
            options: [...FEATURE_ICON_OPTIONS],
          },
          {
            kind: "text",
            name: "linkLabel",
            label: "Link label",
            maxLength: 40,
          },
          { kind: "url", name: "linkHref", label: "Link" },
        ],
      },
    ],
  },
  {
    type: "FAQ",
    label: "FAQ",
    description: "Questions and answers in an accordion.",
    designOptions: [...BASE_DESIGN, "layout"],
    design: { container: "narrow" },
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      { kind: "textarea", name: "intro", label: "Intro", maxLength: 400, rows: 2 },
      {
        kind: "repeater",
        name: "items",
        label: "Questions",
        itemLabel: "Question",
        max: 20,
        min: 2,
        fields: [
          {
            kind: "text",
            name: "question",
            label: "Question",
            required: true,
            maxLength: 200,
          },
          {
            kind: "richtext",
            name: "answer",
            label: "Answer",
            required: true,
            maxLength: 2000,
          },
        ],
      },
    ],
  },
  {
    type: "CTA",
    label: "Call to action",
    description:
      "A closing prompt to request a quote or get in touch. On a dark background it spans the page; on a light one it is a framed panel.",
    designOptions: [...BASE_DESIGN, "align", "layout"],
    design: { background: "dark", align: "center" },
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      {
        kind: "text",
        name: "heading",
        label: "Heading",
        required: true,
        maxLength: 160,
      },
      {
        kind: "textarea",
        name: "body",
        label: "Body",
        maxLength: 400,
        rows: 3,
      },
      {
        kind: "text",
        name: "primaryLabel",
        label: "Primary button label",
        maxLength: 40,
      },
      { kind: "url", name: "primaryHref", label: "Primary button link" },
      {
        kind: "text",
        name: "secondaryLabel",
        label: "Secondary button label",
        maxLength: 40,
      },
      { kind: "url", name: "secondaryHref", label: "Secondary button link" },
      ...ctaButtonFields("primary", "Primary"),
      ...ctaButtonFields("secondary", "Secondary"),
      {
        kind: "entities",
        name: "targetProduct",
        label: "Product for the buttons",
        entity: "product",
        help: "Optional. Request quotation adds it to the visitor's list; Download brochure releases its brochure.",
        max: 1,
        withDocuments: true,
      },
      {
        kind: "media",
        name: "image",
        label: "Background image",
        help: "Optional. Shown beneath a navy wash so the text stays readable.",
      },
    ],
  },
  catalogueGrid({
    type: "PRODUCT_GRID",
    label: "Product grid",
    description: "A chosen set of products, shown as cards.",
    entity: "product",
    fieldLabel: "Products",
    help: "Only published products appear on the public page.",
  }),
  catalogueGrid({
    type: "CATEGORY_GRID",
    label: "Category grid",
    description: "Top-level categories, shown as cards.",
    entity: "category",
    fieldLabel: "Categories",
    help: "Only published categories appear on the public page.",
  }),
  catalogueGrid({
    type: "SUBCATEGORY_GRID",
    label: "Subcategory grid",
    description: "Subcategories from within one or more categories.",
    entity: "subcategory",
    fieldLabel: "Subcategories",
    help: "Only published subcategories appear on the public page.",
  }),
  catalogueGrid({
    type: "BRAND_GRID",
    label: "Brand grid",
    description: "Manufacturers, shown as cards with their logos.",
    entity: "brand",
    fieldLabel: "Brands",
    help: "Only published brands appear on the public page.",
  }),
  catalogueGrid({
    type: "SPECIALTY_GRID",
    label: "Specialty grid",
    description: "Clinical departments, shown as cards.",
    entity: "specialty",
    fieldLabel: "Specialties",
    help: "Only published specialties appear on the public page.",
  }),
  catalogueGrid({
    type: "SOLUTION_GRID",
    label: "Solution grid",
    description: "Packaged healthcare solutions, shown as image cards.",
    entity: "solution",
    fieldLabel: "Solutions",
    help: "Only published solutions appear on the public page.",
    max: 12,
    design: { background: "dark", layout: "editorial" },
  }),
  catalogueGrid({
    type: "APPLICATION_GRID",
    label: "Application grid",
    description: "Clinical environments and procedures, shown as large image cards.",
    entity: "application",
    fieldLabel: "Applications",
    help: "Applications without a published product are hidden.",
    max: 12,
  }),
  catalogueGrid({
    type: "POST_GRID",
    label: "Article grid",
    description: "Blog articles — the first as a featured story, the rest beside it.",
    entity: "post",
    fieldLabel: "Articles",
    help: "Only published articles appear on the public page. Leave empty to show the latest.",
    max: 6,
    design: { layout: "editorial" },
  }),
  {
    type: "RELATED_LOCATIONS",
    label: "Locations coverage",
    description:
      "Where the company works: every published city, grouped by region, with links to the city pages.",
    designOptions: [...BASE_DESIGN],
    design: { background: "grid", spacing: "large" },
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      { kind: "textarea", name: "intro", label: "Intro", maxLength: 400, rows: 3 },
      {
        kind: "text",
        name: "highlight",
        label: "Headline figure",
        maxLength: 24,
        help: "Optional large label, e.g. “Pan-India”. Leave blank to show the number of cities.",
      },
      { kind: "text", name: "ctaLabel", label: "Link label", maxLength: 40 },
      { kind: "url", name: "ctaHref", label: "Link" },
    ],
  },
  {
    type: "LOGO_STRIP",
    label: "Logo strip",
    description:
      "A row of manufacturer logos. Only include brands the company actually represents. The Full width layout scrolls them slowly.",
    designOptions: [...BASE_DESIGN, "layout"],
    design: { background: "light", spacing: "normal" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "entities",
        name: "items",
        label: "Brands",
        entity: "brand",
        help: "A brand without a logo is shown as its name.",
        max: 30,
      },
    ],
  },
  {
    type: "BROCHURE_DOWNLOAD",
    label: "Brochure download",
    description: "The downloadable documents attached to one product.",
    designOptions: [...BASE_DESIGN],
    design: { background: "light", container: "narrow" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 400,
        rows: 2,
      },
      {
        kind: "entities",
        name: "items",
        label: "Product",
        entity: "product",
        help: "Every document is listed. Ones marked as requiring contact details open a short form first and download once it is sent.",
        min: 1,
        max: 1,
        withDocuments: true,
      },
    ],
  },
  {
    type: "IMAGE_CARDS",
    label: "Image cards",
    description: "A grid of cards, each led by a picture.",
    designOptions: [...BASE_DESIGN, "columns", "cardStyle"],
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 400,
        rows: 3,
      },
      {
        kind: "repeater",
        name: "items",
        label: "Cards",
        itemLabel: "Card",
        max: 12,
        min: 3,
        fields: [
          { kind: "media", name: "image", label: "Image", required: true },
          {
            kind: "text",
            name: "title",
            label: "Title",
            required: true,
            maxLength: 80,
          },
          {
            kind: "textarea",
            name: "body",
            label: "Body",
            maxLength: 300,
            rows: 2,
          },
          {
            kind: "text",
            name: "linkLabel",
            label: "Link label",
            maxLength: 40,
          },
          { kind: "url", name: "linkHref", label: "Link" },
        ],
      },
    ],
  },
  {
    type: "GALLERY",
    label: "Gallery",
    description: "Photographs, shown as a grid that opens at full size.",
    designOptions: [...BASE_DESIGN, "columns"],
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 400,
        rows: 2,
      },
      {
        kind: "repeater",
        name: "items",
        label: "Images",
        itemLabel: "Image",
        max: 24,
        min: 2,
        fields: [
          { kind: "media", name: "image", label: "Image", required: true },
          { kind: "text", name: "caption", label: "Caption", maxLength: 160 },
        ],
      },
    ],
  },
  {
    type: "VIDEO",
    label: "Video",
    description: "A YouTube or Vimeo video, loaded only when someone plays it.",
    designOptions: [...BASE_DESIGN],
    design: { container: "narrow" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 400,
        rows: 2,
      },
      {
        kind: "url",
        name: "url",
        label: "Video link",
        required: true,
        placeholder: "https://www.youtube.com/watch?v=…",
        help: "Paste the address from the browser. YouTube and Vimeo are supported; anything else is shown as a link.",
      },
      {
        kind: "media",
        name: "poster",
        label: "Poster image",
        help: "Shown before the video is played. Nothing is requested from the video host until then.",
      },
    ],
  },
  {
    type: "TESTIMONIALS",
    label: "Testimonials",
    description:
      "Quotes from customers. Only publish words the customer actually said and has approved.",
    designOptions: [...BASE_DESIGN, "columns", "cardStyle"],
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "repeater",
        name: "items",
        label: "Quotes",
        itemLabel: "Quote",
        max: 9,
        min: 1,
        fields: [
          {
            kind: "textarea",
            name: "quote",
            label: "Quote",
            required: true,
            maxLength: 600,
            rows: 4,
          },
          { kind: "text", name: "name", label: "Attributed to", maxLength: 80 },
          {
            kind: "text",
            name: "role",
            label: "Role and organisation",
            maxLength: 120,
          },
        ],
      },
    ],
  },
  {
    type: "TRUST_CERTIFICATIONS",
    label: "Certifications",
    description:
      "Standards and approvals the company actually holds. Never list one that has not been granted.",
    designOptions: [...BASE_DESIGN, "columns"],
    design: { background: "light" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 400,
        rows: 2,
      },
      {
        kind: "repeater",
        name: "items",
        label: "Certifications",
        itemLabel: "Certification",
        max: 12,
        min: 1,
        fields: [
          { kind: "media", name: "image", label: "Mark or logo" },
          {
            kind: "text",
            name: "name",
            label: "Name",
            required: true,
            maxLength: 80,
          },
          {
            kind: "text",
            name: "detail",
            label: "Detail",
            maxLength: 160,
            help: "Scope, certificate number or issuing body.",
          },
        ],
      },
    ],
  },
  {
    type: "TIMELINE",
    label: "Timeline",
    description: "Dated milestones in order.",
    designOptions: [...BASE_DESIGN],
    design: { container: "narrow" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "repeater",
        name: "items",
        label: "Milestones",
        itemLabel: "Milestone",
        max: 20,
        min: 2,
        fields: [
          {
            kind: "text",
            name: "when",
            label: "Year or date",
            required: true,
            maxLength: 40,
          },
          {
            kind: "text",
            name: "title",
            label: "Title",
            required: true,
            maxLength: 120,
          },
          {
            kind: "textarea",
            name: "body",
            label: "Detail",
            maxLength: 400,
            rows: 2,
          },
        ],
      },
    ],
  },
  {
    type: "PROCESS_STEPS",
    label: "Process steps",
    description:
      "A numbered sequence — how an order, an installation or a service call works.",
    designOptions: [...BASE_DESIGN, "columns", "layout"],
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 400,
        rows: 2,
      },
      {
        kind: "repeater",
        name: "items",
        label: "Steps",
        itemLabel: "Step",
        max: 8,
        min: 2,
        fields: [
          {
            kind: "text",
            name: "title",
            label: "Title",
            required: true,
            maxLength: 120,
          },
          {
            kind: "textarea",
            name: "body",
            label: "Detail",
            maxLength: 400,
            rows: 2,
          },
        ],
      },
    ],
  },
  {
    type: "ACCORDION",
    label: "Accordion",
    description:
      "Collapsible sections for detail most visitors do not need at once.",
    designOptions: [...BASE_DESIGN],
    design: { container: "narrow" },
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "repeater",
        name: "items",
        label: "Sections",
        itemLabel: "Section",
        max: 20,
        min: 2,
        fields: [
          {
            kind: "text",
            name: "title",
            label: "Title",
            required: true,
            maxLength: 200,
          },
          {
            kind: "richtext",
            name: "body",
            label: "Content",
            required: true,
            maxLength: 4000,
          },
        ],
      },
    ],
  },
  {
    type: "TABS",
    label: "Tabs",
    description:
      "Panels a visitor switches between — specification, service, delivery.",
    designOptions: [...BASE_DESIGN],
    fields: [
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "repeater",
        name: "items",
        label: "Tabs",
        itemLabel: "Tab",
        max: 8,
        min: 2,
        fields: [
          {
            kind: "text",
            name: "label",
            label: "Tab label",
            required: true,
            maxLength: 60,
          },
          {
            kind: "richtext",
            name: "body",
            label: "Content",
            required: true,
            maxLength: 6000,
          },
        ],
      },
    ],
  },
  {
    type: "FORM",
    label: "Form",
    description:
      "The enquiry form, or one you have built. Enquiries arrive in Leads; a built form's submissions arrive under the form itself.",
    designOptions: [...BASE_DESIGN, "layout"],
    design: { container: "narrow" },
    fields: [
      { kind: "text", name: "overline", label: "Overline", maxLength: 80 },
      { kind: "text", name: "heading", label: "Heading", maxLength: 160 },
      {
        kind: "formKey",
        name: "formKey",
        label: "Form",
        help: "Leave as the enquiry form unless you have built one for this page.",
      },
      {
        kind: "textarea",
        name: "intro",
        label: "Intro",
        maxLength: 600,
        rows: 3,
      },
      {
        kind: "text",
        name: "submitLabel",
        label: "Button label",
        maxLength: 40,
        help: "Defaults to “Send enquiry”.",
      },
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
