import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { PageCreateForm } from "../[id]/page-forms";

export const metadata: Metadata = {
  title: "New page",
  robots: { index: false, follow: false },
};

export default async function NewPagePage() {
  await requirePermission("PAGES", "CREATE");

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New page"
        description="Pages start as a draft. Add sections next, then publish when the page is ready."
        backHref="/admin/pages"
        backLabel="Back to pages"
      />

      <Card>
        <CardContent>
          <PageCreateForm />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
