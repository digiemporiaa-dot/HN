/**
 * The one description of what each content status means to an editor.
 *
 * `label` explains the consequence, for a form where the choice is being made;
 * `short` names the state, for a filter where it is only being matched.
 *
 * Pages, categories and brands all present the same lifecycle; three copies of
 * these labels would drift, and "Published" meaning something subtly different
 * on one screen is exactly the kind of drift nobody notices.
 */
export const CONTENT_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft — not visible publicly", short: "Draft" },
  {
    value: "REVIEW",
    label: "In review — not visible publicly",
    short: "In review",
  },
  {
    value: "PUBLISHED",
    label: "Published — live on the site",
    short: "Published",
  },
  {
    value: "ARCHIVED",
    label: "Archived — not visible publicly",
    short: "Archived",
  },
] as const;
