import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  applicationPath,
  findApplication,
} from "@/server/applications/service";
import {
  deleteApplicationAction,
  updateApplicationAction,
} from "@/server/applications/actions";
import { ApplicationForm } from "../application-form";

export const metadata: Metadata = {
  title: "Edit application",
  robots: { index: false, follow: false },
};

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("APPLICATIONS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const application = await findApplication(id);
  if (!application) notFound();

  const linked = application._count.products;

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title={application.name}
        description={applicationPath(application.slug)}
        backHref="/admin/applications"
        backLabel="Back to applications"
        actions={
          can("APPLICATIONS", "DELETE") ? (
            <form action={deleteApplicationAction}>
              <input
                type="hidden"
                name="applicationId"
                value={application.id}
              />
              <Button type="submit" variant="outline" size="sm">
                <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
                Delete
              </Button>
            </form>
          ) : null
        }
      />

      {linked > 0 && can("APPLICATIONS", "DELETE") ? (
        <p className="border-line bg-surface-muted text-body-sm text-ink-muted rounded-md border p-3.5">
          {linked} product{linked === 1 ? "" : "s"} carr
          {linked === 1 ? "ies" : "y"} this application. Deleting it removes the
          label from {linked === 1 ? "that product" : "those products"} and
          nothing else — no product is deleted.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationForm
            mode="edit"
            version={application.updatedAt.toISOString()}
            action={updateApplicationAction}
            readOnly={!can("APPLICATIONS", "EDIT")}
            values={{
              id: application.id,
              name: application.name,
              slug: application.slug,
              description: application.description ?? "",
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
