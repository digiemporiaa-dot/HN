import { appUrl } from "@/lib/site-config";
import type { SiteSettings } from "@/server/settings/service";

/**
 * Structured data builders.
 *
 * One rule runs through all of them: nothing is asserted that the database does
 * not actually hold. No prices, because the catalogue has none and every
 * product is quoted; no ratings or review counts, because none have been
 * collected. A rich result built on invented numbers is a lie told at scale,
 * and search engines penalise it once they notice.
 */

/** Turns a site-relative path into the absolute URL structured data requires. */
export function absolute(path: string): string {
  return new URL(path, appUrl()).toString();
}

export function organizationJsonLd(settings: SiteSettings) {
  const social = Object.values(settings.social).filter(
    (url): url is string => typeof url === "string" && url.length > 0,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.companyName,
    url: appUrl(),
    ...(settings.seo.defaultDescription
      ? { description: settings.seo.defaultDescription }
      : {}),
    ...(settings.logoUrl ? { logo: absolute(settings.logoUrl) } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.phone
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: settings.phone,
              contactType: "sales",
            },
          ],
        }
      : {}),
    ...(settings.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.address,
          },
        }
      : {}),
    ...(social.length > 0 ? { sameAs: social } : {}),
  };
}

export function websiteJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.companyName,
    url: appUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absolute("/products?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ label: string; href?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      // The last crumb is the current page and carries no link, which is what
      // schema.org expects: an item without a URL is the position itself.
      ...(item.href ? { item: absolute(item.href) } : {}),
    })),
  };
}

export type ProductStructuredData = {
  name: string;
  path: string;
  description: string | null;
  modelNumber: string | null;
  images: string[];
  brandName: string | null;
  categoryName: string;
};

export function productJsonLd(product: ProductStructuredData) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: absolute(product.path),
    category: product.categoryName,
    ...(product.description ? { description: product.description } : {}),
    ...(product.modelNumber
      ? { sku: product.modelNumber, mpn: product.modelNumber }
      : {}),
    ...(product.images.length > 0
      ? { image: product.images.map(absolute) }
      : {}),
    ...(product.brandName
      ? { brand: { "@type": "Brand", name: product.brandName } }
      : {}),
    // Deliberately no offers, no price and no availability. Equipment here is
    // quoted per order and the database holds no number to publish; inventing
    // one to satisfy a rich-result checker would be publishing a false price.
  };
}

/**
 * The plain text of a rich-text value, for structured data, which carries
 * text rather than markup: emphasis markers dropped, links reduced to their
 * labels, paragraphs joined by a blank line.
 */
export function richTextToPlain(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Questions and answers shown on the page, as an FAQPage.
 *
 * Only ever built from the questions the page itself displays, so the markup
 * describes what a visitor can read rather than anything held back for search
 * engines. Questions with an empty answer are left out.
 */
export function faqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>,
) {
  const items = faqs
    .map((faq) => ({
      question: faq.question.trim(),
      answer: richTextToPlain(faq.answer),
    }))
    .filter((faq) => faq.question && faq.answer);
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * The products listed on a catalogue page, in the order shown.
 *
 * A summary list of links, as schema.org intends for a category or search
 * page: each entry points at the product's own page, which carries the
 * product's details.
 */
export function itemListJsonLd(
  name: string,
  items: Array<{ name: string; path: string }>,
  offset = 0,
) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: offset + index + 1,
      url: absolute(item.path),
      name: item.name,
    })),
  };
}

/** The contact page, tied to the organisation the layout already describes. */
export function contactPageJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${settings.companyName}`,
    url: absolute("/contact"),
    about: {
      "@type": "Organization",
      name: settings.companyName,
      url: appUrl(),
    },
  };
}
