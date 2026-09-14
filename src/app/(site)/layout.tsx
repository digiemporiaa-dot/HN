import Link from "next/link";

import { Container } from "@/components/ui";
import { siteConfig } from "@/lib/site-config";

/**
 * Structural shell for the public website. The CMS-managed header, mega menu and
 * footer replace the placeholders here in Phase 11.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-line bg-surface/95 sticky top-0 z-50 border-b backdrop-blur">
        <Container className="flex h-18 items-center justify-between gap-8">
          <Link
            href="/"
            className="text-h4 text-ink font-display tracking-tight"
          >
            {siteConfig.name}
          </Link>
        </Container>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="surface-dark border-line border-t">
        <Container className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-h4 font-display">{siteConfig.name}</span>
            <p className="text-body-sm text-ink-muted max-w-[52ch]">
              {siteConfig.shortDescription}
            </p>
          </div>
          <p className="text-caption text-ink-subtle">
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </p>
        </Container>
      </footer>
    </div>
  );
}
