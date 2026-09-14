import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";

import { siteConfig } from "@/lib/site-config";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.shortDescription,
};

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
