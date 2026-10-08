import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { createApplicationAction } from "@/server/applications/actions";
import { pickableMedia } from "@/server/media/pickable";
import { ApplicationForm } from "../application-form";

export const metadata: Metadata = {
  title: "New application",
  robots: { index: false, follow: false },
};

export default async function NewApplicationPage() {
  await requirePermission("APPLICATIONS", "CREATE");
  const mediaOptions = await pickableMedia();

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New application"
        description="A procedure or use case products can be tagged with."
        backHref="/admin/applications"
        backLabel="Back to applications"
      />

      <Card>
        <CardContent>
          <ApplicationForm
            mode="create"
            version="new"
            action={createApplicationAction}
            readOnly={false}
            mediaOptions={mediaOptions}
            values={{ name: "", slug: "", description: "", imageId: "" }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
