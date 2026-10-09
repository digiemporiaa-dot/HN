import type { Metadata } from "next";

import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { ctaEditorOptions } from "@/server/cta/service";
import { isCtaKind } from "@/lib/cta/kinds";
import { CtaConfigForm } from "../cta-config-form";
import { newCtaValues } from "@/lib/cta/editor-values";

export const metadata: Metadata = {
  title: "New CTA popup",
  robots: { index: false, follow: false },
};

export default async function NewCtaPopupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("CTA_POPUPS", "CREATE");
  const kind = (await searchParams).kind;
  const options = await ctaEditorOptions();
  return (
    <AdminPage>
      <AdminPageHeader
        title="New CTA popup"
        description="Saved switched off. Check the preview, then switch it on."
        backHref="/admin/cta-popups"
        backLabel="Back to CTA popups"
      />
      <CtaConfigForm mode="create" values={newCtaValues(isCtaKind(kind) ? kind : undefined)} options={options} readOnly={false} />
    </AdminPage>
  );
}
