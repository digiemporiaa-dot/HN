import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileSearch, Route, ScanSearch } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/permissions";
import { getSiteSettings } from "@/server/settings/service";

export const metadata: Metadata = {
  title: "SEO",
  robots: { index: false, follow: false },
};

export default async function SeoPage() {
  await requirePermission("SEO", "VIEW");

  const [redirects, unusedRedirects, overrides, noindexed, settings] =
    await Promise.all([
      prisma.redirect.count({ where: { active: true } }),
      prisma.redirect.count({ where: { active: true, hits: 0 } }),
      prisma.seoOverride.count(),
      prisma.seoOverride.count({ where: { noindex: true } }),
      getSiteSettings(),
    ]);

  const tools = [
    {
      href: "/admin/seo/indexation",
      icon: ScanSearch,
      title: "Indexation",
      body: "What search engines are offered, what is held back, and what needs fixing.",
      stat: settings.seo.noindex
        ? "The whole site is set to noindex"
        : "Checked live on each visit",
    },
    {
      href: "/admin/seo/redirects",
      icon: Route,
      title: "Redirects",
      body: "Old addresses and where they now lead.",
      stat: `${redirects} active${unusedRedirects > 0 ? `, ${unusedRedirects} never followed` : ""}`,
    },
    {
      href: "/admin/seo/metadata",
      icon: FileSearch,
      title: "Page metadata",
      body: "Titles, descriptions, canonicals and indexation for particular pages.",
      stat: `${overrides} override${overrides === 1 ? "" : "s"}${noindexed > 0 ? `, ${noindexed} not indexed` : ""}`,
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="SEO"
        description="What search engines are told about the site, beyond what each page says for itself."
      />
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link href={tool.href} className="group block h-full">
              <Card interactive className="h-full">
                <CardContent className="flex h-full items-start gap-4">
                  <tool.icon
                    aria-hidden="true"
                    className="text-primary mt-0.5 size-5 shrink-0"
                  />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-body text-ink group-hover:text-primary font-medium">
                      {tool.title}
                    </span>
                    <span className="text-body-sm text-ink-muted">
                      {tool.body}
                    </span>
                    <span className="text-caption text-ink-subtle mt-2">
                      {tool.stat}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-ink-subtle size-4"
                  />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}
