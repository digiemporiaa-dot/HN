/**
 * Starting points for the pages a B2B equipment supplier's site is expected to
 * have. Each one lays out the sections; the facts are left as placeholders,
 * because a template that guessed a company's history or certifications would
 * be inventing them.
 */
export const PAGE_TEMPLATES = [
  {
    key: "blank",
    label: "Blank page",
    description: "No sections. Build it up from the editor.",
    title: "",
    slug: "",
  },
  {
    key: "about",
    label: "About us",
    description: "Who you are, how you work, and a closing call to action.",
    title: "About us",
    slug: "about",
  },
  {
    key: "quality",
    label: "Quality and certifications",
    description:
      "The certifications you hold and how you check what you supply.",
    title: "Quality and certifications",
    slug: "quality",
  },
  {
    key: "privacy",
    label: "Privacy policy",
    description:
      "What the site collects and why, already filled in from how it works. Needs your company's details and legal review.",
    title: "Privacy policy",
    slug: "privacy",
  },
  {
    key: "terms",
    label: "Terms of use",
    description:
      "An outline of the terms for using the site. Needs your legal adviser.",
    title: "Terms of use",
    slug: "terms",
  },
] as const;

export type PageTemplateKey = (typeof PAGE_TEMPLATES)[number]["key"];

export const PAGE_TEMPLATE_KEYS = PAGE_TEMPLATES.map(
  (template) => template.key,
) as [PageTemplateKey, ...PageTemplateKey[]];
