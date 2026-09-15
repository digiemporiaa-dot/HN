import Link from "next/link";
import { Phone } from "lucide-react";

import { Container } from "@/components/ui";
import { getMenuTree } from "@/server/navigation/service";
import type { SiteSettings } from "@/server/settings/service";
import { DesktopNav, MobileNav } from "./site-nav";

function Logo({ settings }: { settings: SiteSettings }) {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-3"
      aria-label={`${settings.companyName} — home`}
    >
      {settings.logoUrl ? (
        /* Served from our own media route at its stored size; Next/Image would
           re-encode a logo we deliberately store untouched. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={settings.logoUrl}
          alt={settings.companyName}
          className="h-9 w-auto"
        />
      ) : (
        <span className="text-h4 text-ink font-display tracking-tight">
          {settings.companyName}
        </span>
      )}
    </Link>
  );
}

export async function SiteHeader({ settings }: { settings: SiteSettings }) {
  const items = await getMenuTree("HEADER");

  return (
    // `relative` anchors the mega-menu and mobile panels, which are positioned
    // against the header rather than the viewport so they stay put while the
    // page scrolls underneath.
    <header className="border-line bg-surface/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="relative">
        <Container className="flex h-18 items-center justify-between gap-8">
          <Logo settings={settings} />

          <DesktopNav items={items} />

          <div className="flex items-center gap-4">
            {settings.phone ? (
              <a
                href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                className="text-body-sm text-ink-muted hover:text-ink hidden items-center gap-2 transition-colors sm:inline-flex"
              >
                <Phone aria-hidden="true" className="size-4" />
                {settings.phone}
              </a>
            ) : null}

            <MobileNav items={items} companyName={settings.companyName} />
          </div>
        </Container>
      </div>
    </header>
  );
}
