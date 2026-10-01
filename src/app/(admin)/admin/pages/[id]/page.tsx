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
import { isHomeSlug, pagePublicPath } from "@/server/cms/homepage";

export const metadata: Metadata = {
  title: "Edit page",
  robots: { index: false, follow: false },
};

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const home = isHomeSlug(page.slug);
  const { error } = await searchParams;

  return (
    <AdminPage>
      <AdminPageHeader
        title={page.title}
        description={home ? "The homepage, at /" : `/${page.slug}`}
        backHref="/admin/pages"
        backLabel="Back to pages"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={page.status} />
            {page.status === "PUBLISHED" ? (
              <Link
                href={pagePublicPath(page.slug)}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                View page
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
            {/* The homepage's preview lives at /home, which only staff can
                open; / shows the starter until this is published. */}
            {home ? (
              <Link
                href="/home"
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                Preview
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
            {/* The homepage is unpublished rather than deleted. */}
            {can("PAGES", "DELETE") && !home ? (
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

      {error === "home" ? (
        <p
          role="alert"
          className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm rounded-md border p-4"
        >
          The homepage cannot be deleted. Set it to draft to take it down, and
          visitors will see the starter homepage instead.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Page settings</CardTitle>
        </CardHeader>
        <CardContent>
          <PageSettingsForm
            pageId={page.id}
            title={page.title}
            slug={page.slug}
            isHome={home}
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
