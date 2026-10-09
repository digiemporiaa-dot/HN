import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileQuestion,
  FileSearch,
  Route,
  ScanSearch,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requireAnyPermission } from "@/server/permissions";
import { getSiteSettings } from "@/server/settings/service";

export const metadata: Metadata = {
  title: "SEO",
  robots: { index: false, follow: false },
};

export default async function SeoPage() {
  await requireAnyPermission([
    ["SEO", "VIEW"],
    ["SEO_REDIRECTS", "VIEW"],
    ["SEO_NOT_FOUND", "VIEW"],
    ["SEO_INDEXATION", "VIEW"],
  ]);
  const { can } = await currentPermissions();

  const [redirects, unusedRedirects, overrides, noindexed, settings] =
    await Promise.all([
      prisma.redirect.count({ where: { active: true } }),
      prisma.redirect.count({ where: { active: true, hits: 0 } }),
      prisma.seoOverride.count(),
      prisma.seoOverride.count({ where: { noindex: true } }),
      getSiteSettings(),
    ]);
  const [missing, missingRequests] = await Promise.all([
    prisma.notFoundHit.count({ where: { ignored: false } }),
    prisma.notFoundHit.aggregate({
      where: { ignored: false },
      _sum: { hits: true },
    }),
  ]);

  const tools = [
    {
      module: "SEO_INDEXATION" as const,
      href: "/admin/seo/indexation",
      icon: ScanSearch,
      title: "Indexation",
      body: "What search engines are offered, what is held back, and what needs fixing.",
      stat: settings.seo.noindex
        ? "The whole site is set to noindex"
        : "Checked live on each visit",
    },
    {
      module: "SEO_REDIRECTS" as const,
      href: "/admin/seo/redirects",
      icon: Route,
      title: "Redirects",
      body: "Old addresses and where they now lead.",
      stat: `${redirects} active${unusedRedirects > 0 ? `, ${unusedRedirects} never followed` : ""}`,
    },
    {
      module: "SEO_NOT_FOUND" as const,
      href: "/admin/seo/not-found",
      icon: FileQuestion,
      title: "Not found",
      body: "Addresses people and search engines ask for that do not exist.",
      stat:
        missing === 0
          ? "Nothing open"
          : `${missing} open, ${missingRequests._sum.hits ?? 0} requests`,
    },
    {
      module: "SEO" as const,
      href: "/admin/seo/metadata",
      icon: FileSearch,
      title: "Page metadata",
      body: "Titles, descriptions, canonicals and indexation for particular pages.",
      stat: `${overrides} override${overrides === 1 ? "" : "s"}${noindexed > 0 ? `, ${noindexed} not indexed` : ""}`,
    },
  ].filter((tool) => can(tool.module, "VIEW"));

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
