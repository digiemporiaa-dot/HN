import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { createFormAction } from "@/server/forms/actions";
import { FormDetails } from "../form-details";

export const metadata: Metadata = {
  title: "New form",
  robots: { index: false, follow: false },
};

export default async function NewFormPage() {
  await requirePermission("FORMS", "CREATE");
  const { can } = await currentPermissions();

  return (
    <AdminPage>
      <AdminPageHeader
        title="New form"
        description="Name it and give it a key. The questions come next."
        backHref="/admin/forms"
        backLabel="Back to forms"
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FormDetails
            mode="create"
            action={createFormAction}
            canPublish={can("FORMS", "EDIT")}
            readOnly={false}
            version="new"
            values={{
              name: "",
              key: "",
              description: "",
              successMessage: "",
              submitLabel: "",
              notifyEmail: "",
              status: "DRAFT",
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
