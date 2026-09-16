import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge, buttonStyles, EmptyState, StatusBadge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { FORM_LIST_SELECT, type FormRow } from "@/server/forms/service";

export const metadata: Metadata = {
  title: "Forms",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("FORMS", "VIEW");
  const params = await searchParams;
  const { can } = await currentPermissions();

  const forms = (await prisma.form.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: FORM_LIST_SELECT,
  })) as FormRow[];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Forms"
        description="Forms you build and embed on a page. Enquiries and quotation requests have their own, which these cannot change."
        actions={
          can("FORMS", "CREATE") ? (
            <Link href="/admin/forms/new" className={buttonStyles({})}>
              <Plus aria-hidden="true" className="size-4" />
              New form
            </Link>
          ) : null
        }
      />

      <DataTable
        rows={forms}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/forms/${row.id}`}
        basePath="/admin/forms"
        searchParams={params}
        total={forms.length}
        page={1}
        pageSize={Math.max(forms.length, 1)}
        entityLabel="form"
        emptyState={
          <EmptyState
            title="No forms yet"
            description="Build one when a page needs to ask something the enquiry form does not."
            action={
              can("FORMS", "CREATE") ? (
                <Link href="/admin/forms/new" className={buttonStyles({})}>
                  New form
                </Link>
              ) : null
            }
          />
        }
        columns={[
          {
            key: "name",
            header: "Form",
            cell: (row) => (
              <div className="flex flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row.name}
                </span>
                <span className="text-caption text-ink-muted">{row.key}</span>
              </div>
            ),
          },
          {
            key: "fields",
            header: "Questions",
            priority: "meta",
            cell: (row) => String(row._count.fields),
          },
          {
            key: "submissions",
            header: "Submissions",
            priority: "meta",
            cell: (row) =>
              row._count.submissions > 0 ? (
                <Badge tone="neutral">{row._count.submissions}</Badge>
              ) : (
                "—"
              ),
          },
          {
            key: "status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "updatedAt",
            header: "Updated",
            priority: "meta",
            cell: (row) => dateFormatter.format(row.updatedAt),
          },
        ]}
      />
    </AdminPage>
  );
}
