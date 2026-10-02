import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { RedirectForm } from "../redirect-form";

export const metadata: Metadata = {
  title: "New redirect",
  robots: { index: false, follow: false },
};

export default async function NewRedirectPage() {
  await requirePermission("SEO", "EDIT");

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New redirect"
        description="Send an old address somewhere that still exists. Pages that are renamed on this site get one automatically."
        backHref="/admin/seo/redirects"
        backLabel="Back to redirects"
      />
      <Card>
        <CardContent>
          <RedirectForm
            mode="create"
            version="new"
            readOnly={false}
            values={{
              fromPath: "",
              toPath: "",
              type: "PERMANENT",
              active: true,
              note: "",
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
