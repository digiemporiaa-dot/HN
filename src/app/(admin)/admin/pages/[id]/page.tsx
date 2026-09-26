import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { deletePageAction } from "@/server/cms/actions";
import { PageSettingsForm } from "./page-forms";
import { SectionsPanel } from "@/components/admin/sections/sections-panel";

export const metadata: Metadata = {
  title: "Edit page",
  robots: { index: false, follow: false },
};

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("PAGES", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;

  const page = await prisma.page.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      updatedAt: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          order: true,
          enabled: true,
          anchorId: true,
          content: true,
          design: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!page) notFound();

  const canEdit = can("PAGES", "EDIT");

  return (
    <AdminPage>
      <AdminPageHeader
        title={page.title}
        description={`/${page.slug}`}
        backHref="/admin/pages"
        backLabel="Back to pages"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={page.status} />
            {page.status === "PUBLISHED" ? (
              <Link
                href={`/${page.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                View page
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
            {can("PAGES", "DELETE") ? (
              <form action={deletePageAction}>
                <input type="hidden" name="pageId" value={page.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2
                    aria-hidden="true"
                    className="text-danger-600 size-4"
                  />
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Page settings</CardTitle>
        </CardHeader>
        <CardContent>
          <PageSettingsForm
            pageId={page.id}
            title={page.title}
            slug={page.slug}
            status={page.status}
            canPublish={can("PAGES", "PUBLISH")}
            readOnly={!canEdit}
            version={page.updatedAt.toISOString()}
          />
        </CardContent>
      </Card>

      <SectionsPanel
        owner={{ kind: "page", id: page.id }}
        sections={page.sections}
        canEdit={canEdit}
        emptyDescription="A page is built from sections stacked top to bottom. Add the first one below."
      />
    </AdminPage>
  );
}
