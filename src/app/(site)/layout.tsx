import Link from "next/link";

import { Container } from "@/components/ui";
import { getSiteSettings } from "@/server/settings/service";
import { BrandTheme } from "@/components/site/brand-theme";

/**
 * Structural shell for the public website. Everything shown here comes from
 * settings, so changing the company name or a phone number is an
 * administrator's job rather than a deploy.
 *
 * The CMS-managed header, mega menu and footer replace the placeholders in
 * Phase 11.
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();

  const socialLinks = Object.entries(settings.social).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandTheme
        primary={settings.primaryColor}
        secondary={settings.secondaryColor}
      />

      <header className="border-line bg-surface/95 sticky top-0 z-50 border-b backdrop-blur">
        <Container className="flex h-18 items-center justify-between gap-8">
          <Link href="/" className="flex items-center gap-3">
            {settings.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- served
                 from our own media route at its stored size */
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

          {settings.phone ? (
            <a
              href={`tel:${settings.phone.replace(/\s+/g, "")}`}
              className="text-body-sm text-ink-muted hover:text-ink transition-colors"
            >
              {settings.phone}
            </a>
          ) : null}
        </Container>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="surface-dark border-line border-t">
        <Container className="flex flex-col gap-8 py-12">
          <div className="flex flex-col gap-6 md:flex-row md:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-h4 font-display">
                {settings.companyName}
              </span>
              {settings.tagline ? (
                <p className="text-body-sm text-ink-muted max-w-[52ch]">
                  {settings.tagline}
                </p>
              ) : null}
            </div>

            <div className="text-body-sm text-ink-muted flex flex-col gap-1.5">
              {settings.email ? (
                <a href={`mailto:${settings.email}`} className="hover:text-ink">
                  {settings.email}
                </a>
              ) : null}
              {settings.phone ? (
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                  className="hover:text-ink"
                >
                  {settings.phone}
                </a>
              ) : null}
              {settings.whatsapp ? (
                <a
                  href={`https://wa.me/${settings.whatsapp}`}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="hover:text-ink"
                >
                  WhatsApp
                </a>
              ) : null}
              {settings.address ? (
                <p className="max-w-[40ch] whitespace-pre-line">
                  {settings.address}
                </p>
              ) : null}
              {settings.hours ? <p>{settings.hours}</p> : null}
            </div>
          </div>

          {socialLinks.length > 0 ? (
            <ul className="text-body-sm text-ink-muted flex flex-wrap gap-5">
              {socialLinks.map(([name, href]) => (
                <li key={name}>
                  <a
                    href={href}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="hover:text-ink capitalize"
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="border-line flex flex-col gap-3 border-t pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-caption text-ink-subtle">
              &copy; {year} {settings.companyName}
              {settings.gstin ? ` · GSTIN ${settings.gstin}` : ""}
            </p>

            <ul className="text-caption text-ink-subtle flex flex-wrap gap-5">
              {settings.legal.privacyUrl ? (
                <li>
                  <Link href={settings.legal.privacyUrl} className="hover:text-ink">
                    Privacy
                  </Link>
                </li>
              ) : null}
              {settings.legal.termsUrl ? (
                <li>
                  <Link href={settings.legal.termsUrl} className="hover:text-ink">
                    Terms
                  </Link>
                </li>
              ) : null}
              {settings.legal.cookiesUrl ? (
                <li>
                  <Link href={settings.legal.cookiesUrl} className="hover:text-ink">
                    Cookies
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        </Container>
      </footer>
    </div>
  );
}
