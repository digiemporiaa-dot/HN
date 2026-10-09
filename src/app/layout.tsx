import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { appUrl } from "@/lib/site-config";
import { getSiteSettings } from "@/server/settings/service";
import { validId, VERIFICATION_TOKEN } from "@/lib/seo/tracking";
import "./globals.css";

/* One geometric family for headings and text: light and bold weights side by
   side carry the editorial headlines, so no second display face is needed. */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

/**
 * Metadata is generated rather than static so the title template, description,
 * favicon and social image all follow the settings an administrator has chosen.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    metadataBase: new URL(appUrl()),
    title: {
      default: settings.seo.defaultTitle,
      template: settings.seo.titleTemplate,
    },
    description: settings.seo.defaultDescription ?? undefined,
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
    openGraph: {
      siteName: settings.companyName,
      type: "website",
      images: settings.ogImageUrl ? [settings.ogImageUrl] : undefined,
    },
    // A staging site says so on every page. robots.txt asks politely; this is
    // the instruction crawlers actually honour. It is inherited rather than
    // forced — a page that sets its own robots wins — but the only pages that
    // do are already asking not to be indexed.
    ...(settings.seo.noindex
      ? { robots: { index: false, follow: false } }
      : {}),
    ...verification(settings),
  };
}

/**
 * Search-engine ownership tags. Only well-formed tokens are written, so a
 * malformed value is simply absent rather than broken markup in every page.
 */
function verification(
  settings: Awaited<ReturnType<typeof getSiteSettings>>,
): Pick<Metadata, "verification"> {
  const google = validId(settings.seo.googleVerification, VERIFICATION_TOKEN);
  const bing = validId(settings.seo.bingVerification, VERIFICATION_TOKEN);
  if (!google && !bing) return {};
  return {
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a1626",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables must sit on <html>: the `--font-sans` token is computed at
    // :root, so a reference defined lower down would be invalid at that point.
    // The admin sets data-admin-theme on <html> before hydration.
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
