import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { getSiteSettings } from "@/server/settings/service";
import { appUrl } from "@/lib/site-config";
import { readStringParam } from "@/lib/utils/query";
import { OverrideForm } from "../override-form";

export const metadata: Metadata = {
  title: "New metadata override",
  robots: { index: false, follow: false },
};

export default async function NewOverridePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("SEO", "EDIT");
  const { can } = await currentPermissions();
  const params = await searchParams;
  const [mediaOptions, settings] = await Promise.all([
    pickableMedia(),
    getSiteSettings(),
  ]);

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New metadata override"
        description="Change what search engines and social networks are told about one page, without touching the page."
        backHref="/admin/seo/metadata"
        backLabel="Back to page metadata"
      />
      <Card>
        <CardContent>
          <OverrideForm
            mode="create"
            version="new"
            readOnly={false}
            canPublish={can("SEO", "PUBLISH")}
            mediaOptions={mediaOptions}
            titleTemplate={settings.seo.titleTemplate}
            siteUrl={appUrl()}
            values={{
              path: readStringParam(params.path) ?? "",
              title: "",
              titleAbsolute: false,
              description: "",
              canonical: "",
              noindex: false,
              ogImageId: "",
              note: "",
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
