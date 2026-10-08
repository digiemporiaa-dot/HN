import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";

import { buttonStyles, Container } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { prisma } from "@/server/db";
import { getMenuTree } from "@/server/navigation/service";
import { getMegaMenuData } from "@/server/navigation/mega";
import { locationsIndex } from "@/server/locations/public";
import type { SiteSettings } from "@/server/settings/service";
import type { LegalLink } from "@/server/legal/links";
import { BrandMark } from "./brand-mark";

type FooterLink = { id: string; label: string; href: string; external?: boolean };
type FooterColumn = { id: string; label: string; links: FooterLink[] };

function externalProps(href: string) {
  return href.startsWith("http")
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
}

/** Small monochrome marks for the social links an administrator has set. */
const SOCIAL_ICONS: Record<string, string> = {
  linkedin:
    "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.77 2.55 4.77 5.86v5.59h-4v-4.96c0-1.18-.02-2.7-1.69-2.7-1.69 0-1.95 1.29-1.95 2.62v5.04h-4v-11Z",
  facebook:
    "M13.5 21v-7.5h2.53l.38-2.94H13.5V8.69c0-.85.24-1.43 1.46-1.43h1.56V4.63a20.6 20.6 0 0 0-2.27-.12c-2.25 0-3.79 1.37-3.79 3.89v2.17H7.92v2.94h2.54V21h3.04Z",
  instagram:
    "M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm5-8.1a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.5c-2.3 0-2.6 0-3.5.05-2.4.11-3.8 1.46-3.9 3.9C4.5 8.4 4.5 8.7 4.5 12s0 3.6.05 4.5c.11 2.4 1.46 3.8 3.9 3.9.9.05 1.2.05 3.5.05s2.6 0 3.5-.05c2.4-.11 3.8-1.46 3.9-3.9.05-.9.05-1.2.05-4.5s0-3.6-.05-4.5c-.11-2.4-1.46-3.8-3.9-3.9C14.6 3.5 14.3 3.5 12 3.5Z",
  youtube:
    "M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z",
  x: "M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.36 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z",
};

/**
 * The footer columns: the administrator's footer menu when it has one, and a
 * complete default built from the catalogue when it does not.
 */
async function columnsFor(): Promise<FooterColumn[]> {
  const [menu, mega, states, about] = await Promise.all([
    getMenuTree("FOOTER"),
    getMegaMenuData(),
    locationsIndex().catch(() => []),
    prisma.page
      .findFirst({
        where: { slug: "about", status: "PUBLISHED", deletedAt: null },
        select: { title: true },
      })
      .catch(() => null),
  ]);

  const configured = menu
    .filter((column) => column.children.length > 0)
    .map((column) => ({
      id: column.id,
      label: column.label,
      links: column.children.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href ?? "#",
        external: item.openInNewTab,
      })),
    }));

  const cities = states.flatMap((state) => state.cities).slice(0, 6);
  const locationsColumn: FooterColumn | null =
    cities.length > 0
      ? {
          id: "auto-locations",
          label: "Locations",
          links: [
            ...cities.map((city) => ({
              id: city.id,
              label: city.name,
              href: city.href,
            })),
            { id: "all-locations", label: "All locations", href: "/locations" },
          ],
        }
      : null;

  if (configured.length > 0) {
    const hasLocations = configured.some((column) =>
      column.links.some((link) => link.href.startsWith("/locations")),
    );
    return locationsColumn && !hasLocations && configured.length < 4
      ? [...configured, locationsColumn]
      : configured;
  }

  const products: FooterColumn = {
    id: "auto-products",
    label: "Products",
    links: [
      ...mega.categories.slice(0, 6).map((row) => ({
        id: row.href,
        label: row.name,
        href: row.href,
      })),
      { id: "all-products", label: "All products", href: "/products" },
    ],
  };

  const company: FooterColumn = {
    id: "auto-company",
    label: "Company",
    links: [
      ...(about ? [{ id: "about", label: "About us", href: "/about" }] : []),
      { id: "solutions", label: "Solutions", href: "/solutions" },
      { id: "specialties", label: "Specialties", href: "/specialties" },
      { id: "brands", label: "Brands", href: "/brands" },
      { id: "contact", label: "Contact", href: "/contact" },
    ],
  };

  const resources: FooterColumn = {
    id: "auto-resources",
    label: "Resources",
    links: [
      { id: "blog", label: "Insights & guides", href: "/blog" },
      { id: "applications", label: "Clinical applications", href: "/applications" },
      { id: "categories", label: "Equipment categories", href: "/categories" },
      { id: "rfq", label: "Request a quote", href: "/rfq" },
    ],
  };

  return [products, company, resources, ...(locationsColumn ? [locationsColumn] : [])];
}

export async function SiteFooter({
  settings,
  legalFallback,
}: {
  settings: SiteSettings;
  /** The legal pages from the settings, used while the legal menu is empty. */
  legalFallback: Record<string, LegalLink | null>;
}) {
  const [columns, legalMenu] = await Promise.all([
    columnsFor(),
    getMenuTree("LEGAL"),
  ]);

  // An administrator's legal menu wins. Without one, the policies the
  // settings point at are listed, so a published privacy policy is never
  // unreachable from the footer just because nobody built the menu.
  const legal =
    legalMenu.length > 0
      ? legalMenu.map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
        }))
      : Object.values(legalFallback)
          .filter((link): link is LegalLink => link !== null)
          .map((link) => ({
            id: link.href,
            label: link.label,
            href: link.href,
          }));

  const year = new Date().getFullYear();
  const socialLinks = Object.entries(settings.social).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  const description =
    settings.description ??
    "Medical equipment and healthcare infrastructure solutions for hospitals, clinics, diagnostic centres and healthcare institutions across India.";

  return (
    <footer className="surface-pearl border-line relative overflow-hidden border-t">
      <Container width="wide" className="flex flex-col gap-14 pt-16 pb-10 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-4">
            <Link href="/" aria-label={`${settings.companyName} — home`} className="w-fit">
              <BrandMark name={settings.companyName} logoUrl={settings.logoUrl} />
            </Link>
            <p className="text-body-sm text-ink-muted max-w-[42ch]">{description}</p>

            <ul className="text-body-sm text-ink-muted flex flex-col gap-3">
              {settings.phone ? (
                <li>
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="hover:text-ink inline-flex items-center gap-3 transition-colors">
                    <Phone aria-hidden="true" className="size-4 shrink-0 text-cyan-600" />
                    {settings.phone}
                  </a>
                </li>
              ) : null}
              {settings.email ? (
                <li>
                  <a href={`mailto:${settings.email}`} className="hover:text-ink inline-flex items-center gap-3 break-all transition-colors">
                    <Mail aria-hidden="true" className="size-4 shrink-0 text-cyan-600" />
                    {settings.email}
                  </a>
                </li>
              ) : null}
              {settings.address ? (
                <li className="flex items-start gap-3">
                  <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-cyan-600" />
                  <span className="whitespace-pre-line">{settings.address}</span>
                </li>
              ) : null}
              {settings.hours ? (
                <li className="flex items-start gap-3">
                  <Clock aria-hidden="true" className="mt-1 size-4 shrink-0 text-cyan-600" />
                  <span>{settings.hours}</span>
                </li>
              ) : null}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/rfq" className={cn(buttonStyles({ size: "md" }), "group")}>
                Get a quote
                <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
              </Link>
              <Link
                href="/contact"
                className={buttonStyles({ variant: "outline", size: "md" })}
              >
                Contact our team
              </Link>
            </div>

            {socialLinks.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Social media">
                {socialLinks.map(([name, href]) => (
                  <li key={name}>
                    <a
                      href={href}
                      rel="noopener noreferrer"
                      target="_blank"
                      aria-label={name === "x" ? "X" : name[0].toUpperCase() + name.slice(1)}
                      className="border-line text-ink-muted hover:text-ink hover:border-line-strong flex size-10 items-center justify-center rounded-full border transition-colors"
                    >
                      {SOCIAL_ICONS[name] ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                          <path d={SOCIAL_ICONS[name]} />
                        </svg>
                      ) : (
                        <span className="text-caption capitalize">{name}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div
            className={cn(
              "grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-8",
              columns.length >= 4 && "lg:grid-cols-4",
            )}
          >
            {columns.map((column) => (
              <nav key={column.id} aria-label={column.label} className="min-w-0">
                <h2 className="text-overline text-ink mb-5 font-semibold tracking-[0.1em] uppercase">
                  {column.label}
                </h2>
                <ul className="flex flex-col gap-3">
                  {column.links.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="text-body-sm text-ink-muted hover:text-ink text-safe transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="border-line flex flex-col gap-4 border-t pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-caption text-ink-subtle">
            &copy; {year} {settings.companyName}. All rights reserved.
            {settings.gstin ? ` · GSTIN ${settings.gstin}` : ""}
          </p>

          {legal.length > 0 ? (
            <nav aria-label="Legal">
              <ul className="text-caption text-ink-subtle flex flex-wrap gap-x-6 gap-y-2">
                {legal.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href ?? "#"}
                      {...externalProps(item.href ?? "")}
                      className="hover:text-ink transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </Container>
    </footer>
  );
}
