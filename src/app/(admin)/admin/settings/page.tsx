import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils/cn";
import { buildQueryHref, readStringParam } from "@/lib/utils/query";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  SETTING_GROUPS,
  settingsForGroup,
  type SettingGroup,
} from "@/server/settings/registry";
import { getSettings } from "@/server/settings/service";
import { SettingsGroupForm, type SettingField } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

const BASE = "/admin/settings";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("SETTINGS", "VIEW");
  const { can } = await currentPermissions();
  const readOnly = !can("SETTINGS", "MANAGE_SETTINGS");

  const params = await searchParams;
  const requested = readStringParam(params.group);
  const activeGroup: SettingGroup =
    SETTING_GROUPS.find((group) => group.key === requested)?.key ?? "company";

  const [values, mediaAssets] = await Promise.all([
    getSettings(),
    prisma.mediaAsset.findMany({
      where: { deletedAt: null, kind: { in: ["IMAGE", "VECTOR"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, originalName: true, title: true },
    }),
  ]);

  const group = SETTING_GROUPS.find((entry) => entry.key === activeGroup)!;

  const fields: SettingField[] = settingsForGroup(activeGroup).map(
    (definition) => ({
      key: definition.key,
      type: definition.type,
      label: definition.label,
      description: definition.description,
      placeholder: definition.placeholder,
      value: values[definition.key] ?? "",
    }),
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Settings"
        description="Global values used across the website. Contact details, branding and default SEO all come from here rather than being written into pages."
      />

      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="flex flex-col gap-0.5">
          {SETTING_GROUPS.map((entry) => {
            const active = entry.key === activeGroup;
            return (
              <Link
                key={entry.key}
                href={buildQueryHref(BASE, params, { group: entry.key })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-body-sm rounded-md px-3 py-2 transition-colors",
                  active
                    ? "bg-navy-900 font-medium text-white"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <Card>
          <CardHeader>
            <CardTitle>{group.label}</CardTitle>
            <p className="text-body-sm text-ink-muted">{group.description}</p>
          </CardHeader>
          <CardContent>
            <SettingsGroupForm
              // Remounts when the group changes so defaultValue reflects the
              // newly selected section rather than the previous one.
              key={activeGroup}
              group={activeGroup}
              fields={fields}
              readOnly={readOnly}
              mediaOptions={mediaAssets.map((asset) => ({
                id: asset.id,
                label: asset.title ?? asset.originalName,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
