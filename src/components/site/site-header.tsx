import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { buttonStyles, Container } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { getMenuTree, type NavigationNode } from "@/server/navigation/service";
import { getMegaMenuData } from "@/server/navigation/mega";
import type { SiteSettings } from "@/server/settings/service";
import {
  DesktopNav,
  HeaderShell,
  MobileNav,
  type HeaderItem,
  type MegaKind,
} from "./site-nav";
import { QuoteBasketLink } from "./quote-basket";
import { BrandMark } from "./brand-mark";

/**
 * Used only while the CMS header menu is empty, so a fresh install still has
 * a complete header. Every entry is a route the application always serves.
 */
const DEFAULT_ITEMS: Array<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Solutions", href: "/solutions" },
  { label: "Specialties", href: "/specialties" },
  { label: "Locations", href: "/locations" },
  { label: "Contact", href: "/contact" },
];

function megaFor(href: string | null): MegaKind | null {
  if (!href) return null;
  if (href === "/products" || href === "/categories") return "catalogue";
  if (href === "/specialties") return "specialties";
  if (href === "/solutions") return "solutions";
  return null;
}

function toItems(nodes: NavigationNode[]): HeaderItem[] {
  if (nodes.length > 0) {
    return nodes.map((node) => ({ ...node, mega: megaFor(node.href) }));
  }
  return DEFAULT_ITEMS.map((item, order) => ({
    id: `default-${order}`,
    label: item.label,
    href: item.href,
    description: null,
    order,
    depth: 0,
    visible: true,
    openInNewTab: false,
    highlight: false,
    imageUrl: null,
    imageAlt: "",
    version: "default",
    children: [],
    mega: megaFor(item.href),
  }));
}

export async function SiteHeader({ settings }: { settings: SiteSettings }) {
  const [tree, mega] = await Promise.all([
    getMenuTree("HEADER"),
    getMegaMenuData(),
  ]);

  // An item the editor marked "highlight" is drawn as the header's call to
  // action; without one, the quotation request is.
  const highlighted = tree.find((node) => node.highlight && node.href);
  const items = toItems(tree.filter((node) => node !== highlighted));
  const cta = highlighted
    ? { label: highlighted.label, href: highlighted.href ?? "/rfq" }
    : { label: "Get a quote", href: "/rfq" };

  return (
    <HeaderShell>
      <div className="relative">
        {/* Three columns on desktop so the menu sits on the page's centre line
            whatever the width of the logo and the actions either side. */}
        <Container width="wide" className="flex h-[var(--header-h)] items-center justify-between gap-3 sm:gap-6 xl:grid xl:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            className="flex min-w-0 items-center"
            aria-label={`${settings.companyName} — home`}
          >
            <BrandMark name={settings.companyName} logoUrl={settings.logoUrl} />
          </Link>

          <DesktopNav items={items} data={mega} />

          <div className="flex items-center gap-2 sm:gap-3 xl:justify-self-end">
            {settings.phone ? (
              <a
                href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                className="text-body-sm text-ink-muted hover:text-ink hidden items-center gap-2 font-medium transition-colors 2xl:inline-flex"
              >
                <Phone aria-hidden="true" className="size-4" />
                {settings.phone}
              </a>
            ) : null}

            <QuoteBasketLink />

            <Link
              href={cta.href}
              className={cn(buttonStyles({ size: "sm" }), "group hidden h-10 px-4 sm:inline-flex")}
            >
              {cta.label}
              <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
            </Link>

            <MobileNav
              items={items}
              data={mega}
              companyName={settings.companyName}
              phone={settings.phone}
              quoteHref={cta.href}
            />
          </div>
        </Container>
      </div>
    </HeaderShell>
  );
}
