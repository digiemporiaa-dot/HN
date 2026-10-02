import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { indexationReport } from "@/server/seo/indexation";

export const metadata: Metadata = {
  title: "Indexation",
  robots: { index: false, follow: false },
};

/**
 * What is offered to search engines and what is held back.
 *
 * Built fresh on each visit from the same rules the sitemap and robots tags
 * use, so it describes what is served now rather than what was intended.
 */
export default async function IndexationPage() {
  await requirePermission("SEO", "VIEW");
  const report = await indexationReport();

  const offered = report.types.reduce((sum, row) => sum + row.in, 0);
  const held = report.types.reduce((sum, row) => sum + row.out, 0);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Indexation"
        description="What search engines are offered, what is held back, and what would make the pages that are offered do better."
        backHref="/admin/seo"
        backLabel="Back to SEO"
      />

      {report.siteNoindex ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-4"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            <strong>The whole site is asking not to be indexed.</strong> Every
            page carries noindex, robots.txt disallows everything and the
            sitemap is empty, whatever is shown below. This is right for a
            staging site and wrong for a live one. It is set under{" "}
            <Link
              href="/admin/settings"
              className="underline underline-offset-4"
            >
              Settings → SEO
            </Link>
            .
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Published pages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-body-sm text-ink-muted">
            {offered} offered to search engines, {held} held back. Drafts are
            not counted: nobody outside the team can open them.
          </p>
          <table className="text-body-sm w-full">
            <thead>
              <tr className="text-caption text-ink-subtle border-line border-b text-left">
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 text-right font-medium">Published</th>
                <th className="py-2 text-right font-medium">Indexed</th>
                <th className="py-2 text-right font-medium">Held back</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {report.types.map((row) => (
                <tr key={row.label}>
                  <td className="text-ink py-2.5">{row.label}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {row.total}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{row.in}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {row.out > 0 ? <Badge tone="warning">{row.out}</Badge> : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Held back ({report.excluded.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {report.excluded.length === 0 ? (
            <p className="text-body-sm text-ink-muted">
              Every published page is offered to search engines.
            </p>
          ) : (
            <ul className="divide-line divide-y">
              {report.excluded.map((row) => (
                <li
                  key={`${row.path}-${row.reason}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body-sm text-ink font-medium break-all">
                      {row.path}
                    </span>
                    <span className="text-caption text-ink-muted">
                      {row.reason}
                    </span>
                  </span>
                  <Link
                    href={row.fixHref}
                    className="text-body-sm text-primary underline underline-offset-4"
                  >
                    {row.fixLabel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {report.attention.every((group) => group.total === 0) ? (
            <p className="text-body-sm text-success-700 flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Nothing to fix.
            </p>
          ) : null}
          {report.attention
            .filter((group) => group.total > 0)
            .map((group) => (
              <section
                key={group.key}
                aria-labelledby={`attention-${group.key}`}
                className="flex flex-col gap-2"
              >
                <h3
                  id={`attention-${group.key}`}
                  className="text-body text-ink flex items-center gap-2 font-medium"
                >
                  {group.title}
                  <Badge tone="warning">{group.total}</Badge>
                </h3>
                <p className="text-caption text-ink-muted">{group.why}</p>
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => (
                    <li key={item.href + item.label} className="text-body-sm">
                      <Link
                        href={item.href}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {item.label}
                      </Link>
                      {item.detail ? (
                        <span className="text-caption text-ink-subtle">
                          {" "}
                          — {item.detail}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {group.total > group.items.length ? (
                  <p className="text-caption text-ink-subtle">
                    and {group.total - group.items.length} more
                  </p>
                ) : null}
              </section>
            ))}
          {report.redirectCheckCapped ? (
            <p className="text-caption text-ink-subtle">
              Only the {report.redirectsChecked} most recently changed redirects
              were checked.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
