import { getSiteSettings } from "@/server/settings/service";
import { BrandTheme } from "@/components/site/brand-theme";
import { SiteHeader } from "@/components/site/site-header";
import { QuoteBasketProvider } from "@/components/site/quote-basket";
import { SiteFooter } from "@/components/site/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/server/seo/structured-data";

/**
 * Structural shell for the public website.
 *
 * Both the chrome and the menus inside it come from the database, so changing
 * the company name, a phone number or the entire navigation is an
 * administrator's job rather than a deploy.
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();

  return (
    <QuoteBasketProvider>
      <div className="flex min-h-dvh flex-col">
        <BrandTheme
          primary={settings.primaryColor}
          secondary={settings.secondaryColor}
        />

        {/* Site-wide structured data: who the company is, and that the catalogue
          is searchable. Both are facts the settings already hold. */}
        <JsonLd data={organizationJsonLd(settings)} />
        <JsonLd data={websiteJsonLd(settings)} />

        <SiteHeader settings={settings} />

        <main id="main" className="flex-1">
          {children}
        </main>

        <SiteFooter settings={settings} />
      </div>
    </QuoteBasketProvider>
  );
}
