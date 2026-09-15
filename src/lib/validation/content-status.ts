/**
 * The one description of what each content status means to an editor.
 *
 * Pages, categories and brands all present the same lifecycle; three copies of
 * these labels would drift, and "Published" meaning something subtly different
 * on one screen is exactly the kind of drift nobody notices.
 */
export const CONTENT_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft — not visible publicly" },
  { value: "REVIEW", label: "In review — not visible publicly" },
  { value: "PUBLISHED", label: "Published — live on the site" },
  { value: "ARCHIVED", label: "Archived — not visible publicly" },
] as const;
