import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
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
import { sendTestMailAction } from "@/server/mail/actions";
import { SettingsGroupForm, type SettingField } from "./settings-form";
import { MailTestForm } from "./mail-test";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

const BASE = "/admin/settings";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

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

  const [values, mediaAssets, deliveries] = await Promise.all([
    getSettings(),
    prisma.mediaAsset.findMany({
      where: { deletedAt: null, kind: { in: ["IMAGE", "VECTOR"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, originalName: true, title: true },
    }),
    // Only fetched for the mail section, where it is the whole point of the
    // screen; every other section pays nothing for it.
    activeGroup === "mail"
      ? prisma.mailDelivery.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            subject: true,
            status: true,
            error: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const group = SETTING_GROUPS.find((entry) => entry.key === activeGroup)!;

  const fields: SettingField[] = settingsForGroup(activeGroup).map(
    (definition) => ({
      key: definition.key,
      type: definition.type,
      label: definition.label,
      description: definition.description,
      placeholder: definition.placeholder,
      // A secret's value never leaves the server. This object is handed to a
      // client component and serialised into the page, so sending the stored
      // SMTP password here would publish it to anyone who may view settings —
      // and into the browser cache besides.
      isSecret: definition.isSecret ?? false,
      value: definition.isSecret ? "" : (values[definition.key] ?? ""),
      isSet: Boolean(values[definition.key]),
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

      {activeGroup === "mail" && !readOnly ? (
        <Card>
          <CardHeader>
            <CardTitle>Check the connection</CardTitle>
            <p className="text-body-sm text-ink-muted">
              Save the settings above first. Every attempt is recorded, whether
              it succeeds or not.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <MailTestForm
              action={sendTestMailAction}
              recipients={
                values["mail.notifyTo"] || values["contact.email"] || ""
              }
            />

            {deliveries.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-label text-ink font-medium">
                  Recent attempts
                </h3>
                <ul className="flex flex-col gap-2">
                  {deliveries.map((delivery) => (
                    <li
                      key={delivery.id}
                      className="border-line flex flex-wrap items-baseline justify-between gap-3 border-b py-2 last:border-0"
                    >
                      <span className="text-body-sm text-ink">
                        {delivery.subject}
                      </span>
                      <span className="text-caption text-ink-muted">
                        {delivery.status}
                        {delivery.error ? ` — ${delivery.error}` : ""} ·{" "}
                        {dateFormatter.format(delivery.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </AdminPage>
  );
}
