import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { StateForm } from "../../state-form";

export const metadata: Metadata = {
  title: "New state",
  robots: { index: false, follow: false },
};

export default async function NewStatePage() {
  await requirePermission("LOCATIONS", "CREATE");

  return (
    <AdminPage>
      <AdminPageHeader
        title="New state"
        backHref="/admin/locations"
        backLabel="Back to locations"
      />
      <Card>
        <CardHeader>
          <CardTitle>State</CardTitle>
        </CardHeader>
        <CardContent>
          <StateForm
            mode="create"
            version="new"
            readOnly={false}
            values={{
              name: "",
              slug: "",
              code: "",
              kind: "STATE",
              active: true,
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
