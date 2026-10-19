import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FilePlus2, FileText, Lock } from "lucide-react";

import { buttonStyles, EmptyState, StatusBadge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { publicUrlForKey } from "@/server/storage/paths";
import { CATALOGUE_LIST_SELECT, CATALOGUES_PATH, type CatalogueRow } from "@/server/catalogues/service";
import { readPageParam } from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "PDF catalogues",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

const sizeLabel = (bytes: number) =>
  bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default async function CataloguesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("PRODUCTS", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const where = { deletedAt: null };

  const [total, rows, downloads] = await Promise.all([
    prisma.catalogue.count({ where }),
    prisma.catalogue.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { ...CATALOGUE_LIST_SELECT, fileId: true },
    }),
    // Leads per file: each gated download is a grant on the catalogue's PDF.
    prisma.documentGrant.groupBy({ by: ["mediaId"], where: { mediaId: { not: null } }, _count: { _all: true } }),
  ]);
  const leadsByFile = new Map(downloads.map((row) => [row.mediaId, row._count._all]));

  return (
    <AdminPage>
      <AdminPageHeader
        title="PDF catalogues"
        description="Catalogues listed on the public Catalogues page. A gated catalogue opens the download form first, and every download is saved as a lead."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={CATALOGUES_PATH}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
            >
              View page
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
            {can("PRODUCTS", "CREATE") ? (
              <Link href="/admin/catalogues/new" className={buttonStyles()}>
                <FilePlus2 aria-hidden="true" className="size-4" />
                New catalogue
              </Link>
            ) : null}
          </div>
        }
      />

      <DataTable<CatalogueRow & { fileId: string }>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.title}
        rowHref={(row) => `/admin/catalogues/${row.id}`}
        basePath="/admin/catalogues"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="catalogue"
        emptyState={
          <EmptyState
            title="No catalogues yet"
            description="Upload a PDF catalogue to list it on the Catalogues page."
            action={
              can("PRODUCTS", "CREATE") ? (
                <Link href="/admin/catalogues/new" className={buttonStyles({ variant: "outline" })}>
                  New catalogue
                </Link>
              ) : null
            }
          />
        }
        columns={[
          {
            key: "title",
            header: "Catalogue",
            priority: "primary",
            cell: (row) => (
              <div className="flex items-center gap-3">
                {row.cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- served
                     from our own media route at its stored size */
                  <img
                    src={publicUrlForKey(row.cover.storageKey)}
                    alt=""
                    className="border-line size-10 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <span className="border-line bg-surface-muted text-ink-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body-sm text-ink flex items-center gap-1.5 font-medium">
                    {row.title}
                    {row.gated ? <Lock aria-label="Asks for details first" className="text-ink-muted size-3.5 shrink-0" /> : null}
                  </span>
                  <span className="text-caption text-ink-muted break-all">
                    {row.file.originalName} · {sizeLabel(row.file.sizeBytes)}
                  </span>
                </div>
              </div>
            ),
          },
          {
            key: "leads",
            header: "Download leads",
            priority: "meta",
            cell: (row) => leadsByFile.get(row.fileId) ?? 0,
          },
          { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          {
            key: "updatedAt",
            header: "Last edited",
            priority: "meta",
            cell: (row) => dateFormatter.format(row.updatedAt),
          },
        ]}
      />
    </AdminPage>
  );
}
