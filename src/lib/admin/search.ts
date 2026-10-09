/** Shapes and limits shared by the admin search box and its server action. */

export const SEARCH_TYPES = [
  "Lead",
  "RFQ",
  "Product",
  "Category",
  "Brand",
  "Specialty",
  "Solution",
  "Application",
  "Page",
  "Post",
  "City",
  "Form",
  "Popup",
  "Media",
  "Staff",
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export type SearchHit = {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string | null;
  href: string;
};

export const SEARCH_GROUP_LABEL: Record<SearchType, string> = {
  Lead: "Leads",
  RFQ: "RFQs",
  Product: "Products",
  Category: "Categories",
  Brand: "Brands",
  Specialty: "Specialties",
  Solution: "Solutions",
  Application: "Applications",
  Page: "Pages",
  Post: "Blog posts",
  City: "Cities",
  Form: "Forms",
  Popup: "Popups",
  Media: "Media",
  Staff: "Staff",
};

/** Longer input is cut, not refused. */
export const SEARCH_MAX_QUERY = 80;
export const SEARCH_MIN_QUERY = 2;
export const SEARCH_PER_TYPE = 5;

export function normaliseQuery(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_QUERY) : "";
}

/** A fixed order, so groups do not reshuffle between keystrokes. */
export function sortHits(hits: SearchHit[]): SearchHit[] {
  return [...hits].sort((a, b) => SEARCH_TYPES.indexOf(a.type) - SEARCH_TYPES.indexOf(b.type));
}
