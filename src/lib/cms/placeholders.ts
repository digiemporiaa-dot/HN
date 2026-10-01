/**
 * Template placeholders.
 *
 * Page templates start with instructions in double square brackets where only
 * the company can supply the fact — its legal name, a certificate it holds, how
 * long it keeps enquiries. Anything still bracketed is not yet true of anyone,
 * so it is never allowed onto a live page: publishing is refused while one
 * remains, and so is saving one into a page that is already live.
 */
export const PLACEHOLDER_PATTERN = /\[\[[\s\S]*?\]\]/;

/** Whether any string anywhere inside a section's content is still a placeholder. */
export function hasPlaceholder(value: unknown): boolean {
  if (typeof value === "string") return PLACEHOLDER_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(hasPlaceholder);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasPlaceholder);
  }
  return false;
}
