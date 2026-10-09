import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge, buttonStyles, EmptyState } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { listCtaConfigs, type CtaConfigRow } from "@/server/cta/service";
import { CTA_KIND_LABELS, CTA_POPUP_TYPE_LABELS } from "@/lib/cta/kinds";
import { placementById } from "@/lib/cta/placements";
import { CtaActiveSwitch } from "./cta-controls";

export const metadata: Metadata = {
  title: "CTA popups",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

function scope(row: CtaConfigRow): string {
  if (row.isDefault) return "Default everywhere";
  const parts = [
    ...row.placements.map((id) => placementById(id)?.label ?? id),
    row.targetProduct ? `Product: ${row.targetProduct.name}` : null,
    row.targetPaths.length ? `Pages: ${row.targetPaths.join(", ")}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Page-builder buttons that choose it";
}

/**
 * What buttons such as Download brochure or Request quotation ask before
 * they act. Configurations reach the site per request, so switching one on
 * or off takes effect within seconds, without republishing anything.
 */
export default async function CtaPopupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("CTA_POPUPS", "VIEW");
  const { can } = await currentPermissions();
  const params = await searchParams;
  const rows = await listCtaConfigs();

  return (
    <AdminPage>
      <AdminPageHeader
        title="CTA popups"
        description="What a button asks before it acts. Without a configuration, a button keeps its built-in behaviour; the most specific active configuration wins."
        actions={
          can("CTA_POPUPS", "CREATE") ? (
            <Link href="/admin/cta-popups/new" className={buttonStyles({})}>
              <Plus aria-hidden="true" className="size-4" />
              New CTA popup
            </Link>
          ) : null
        }
      />
      {params.deleted ? (
        <p role="status" className="border-success-100 bg-success-50 text-success-700 text-body-sm rounded-md border p-3">
          Configuration deleted.
        </p>
      ) : null}

      <DataTable<CtaConfigRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/cta-popups/${row.id}`}
        basePath="/admin/cta-popups"
        searchParams={params}
        total={rows.length}
        page={1}
        pageSize={Math.max(rows.length, 1)}
        entityLabel="configuration"
        emptyState={
          <EmptyState
            title="No CTA popups yet"
            description="Every button is using its built-in behaviour. Create a configuration to change what one asks."
          />
        }
        columns={[
          {
            key: "name",
            header: "Configuration",
            priority: "primary",
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">{row.name}</span>
                <span className="text-caption text-ink-muted font-mono break-all">{row.key}</span>
              </div>
            ),
          },
          {
            key: "kind",
            header: "Button",
            cell: (row) => (
              <div className="flex flex-col gap-0.5">
                <span className="text-body-sm">{CTA_KIND_LABELS[row.kind]}</span>
                <span className="text-caption text-ink-muted">
                  {row.mode === "DIRECT" ? "Direct, no popup" : CTA_POPUP_TYPE_LABELS[row.popupType]}
                </span>
              </div>
            ),
          },
          {
            key: "scope",
            header: "Applies to",
            cell: (row) => (
              <span className="text-body-sm break-words">
                {row.isDefault ? <Badge tone="info">Default</Badge> : null} {scope(row)}
              </span>
            ),
          },
          {
            key: "active",
            header: "Active",
            cell: (row) => <CtaActiveSwitch id={row.id} active={row.active} name={row.name} canPublish={can("CTA_POPUPS", "PUBLISH")} />,
          },
          {
            key: "updated",
            header: "Updated",
            priority: "meta",
            cellClassName: "whitespace-nowrap",
            cell: (row) => `${dateFormatter.format(row.updatedAt)}${row.updatedBy ? ` · ${row.updatedBy.name}` : ""}`,
          },
        ]}
      />
    </AdminPage>
  );
}
