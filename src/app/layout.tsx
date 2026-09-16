import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";

import { appUrl } from "@/lib/site-config";
import { getSiteSettings } from "@/server/settings/service";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
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
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
