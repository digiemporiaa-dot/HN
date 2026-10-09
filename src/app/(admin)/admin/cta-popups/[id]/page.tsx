import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { ctaEditorOptions, findCtaConfig } from "@/server/cta/service";
import { readFieldSettings } from "@/lib/cta/fields";
import { CtaConfigForm, type CtaConfigValues } from "../cta-config-form";
import { CtaActiveSwitch, DeleteCtaConfigButton } from "../cta-controls";

export const metadata: Metadata = {
  title: "CTA popup",
  robots: { index: false, follow: false },
};

export default async function CtaPopupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("CTA_POPUPS", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;
  if (!/^[a-z0-9]{8,40}$/i.test(id)) notFound();
  const [config, options, query] = await Promise.all([findCtaConfig(id), ctaEditorOptions(), searchParams]);
  if (!config) notFound();

  const values: CtaConfigValues = {
    id: config.id,
    key: config.key,
    name: config.name,
    kind: config.kind,
    isDefault: config.isDefault,
    mode: config.mode,
    popupType: config.popupType,
    heading: config.heading,
    description: config.description ?? "",
    submitLabel: config.submitLabel ?? "",
    successMessage: config.successMessage ?? "",
    consentText: config.consentText ?? "",
    privacyHref: config.privacyHref ?? "",
    afterSubmit: config.afterSubmit,
    redirectHref: config.redirectHref ?? "",
    directHref: config.directHref ?? "",
    placements: config.placements,
    targetProductId: config.targetProductId ?? "",
    targetPaths: config.targetPaths.join("\n"),
    fileId: config.fileId ?? "",
    formId: config.formId ?? "",
    fields: readFieldSettings(config.fields, config.popupType),
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title={config.name}
        description={query.created ? "Created, switched off. Check the preview, then switch it on." : `Key: ${config.key}`}
        backHref="/admin/cta-popups"
        backLabel="Back to CTA popups"
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <CtaActiveSwitch id={config.id} active={config.active} name={config.name} canPublish={can("CTA_POPUPS", "PUBLISH")} withLabel />
            {can("CTA_POPUPS", "DELETE") ? <DeleteCtaConfigButton id={config.id} name={config.name} /> : null}
          </div>
        }
      />
      <CtaConfigForm mode="edit" values={values} options={options} readOnly={!can("CTA_POPUPS", "EDIT")} />
    </AdminPage>
  );
}
