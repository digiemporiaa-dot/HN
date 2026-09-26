import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  buttonStyles,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { activeStates } from "@/server/locations/service";
import { NewCityForm } from "./new-city-form";

export const metadata: Metadata = {
  title: "New city",
  robots: { index: false, follow: false },
};

export default async function NewCityPage() {
  await requirePermission("LOCATIONS", "CREATE");
  const { can } = await currentPermissions();
  const states = await activeStates();

  return (
    <AdminPage>
      <AdminPageHeader
        title="New city"
        description="Name it and file it under a state. It starts as a draft; the page itself is written on the next screen."
        backHref="/admin/locations"
        backLabel="Back to locations"
      />

      {states.length === 0 ? (
        <EmptyState
          title="No states yet"
          description="A city is filed under a state. Add the state first."
          action={
            can("LOCATIONS", "CREATE") ? (
              <Link
                href="/admin/locations/states/new"
                className={buttonStyles({})}
              >
                New state
              </Link>
            ) : null
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>City</CardTitle>
          </CardHeader>
          <CardContent>
            <NewCityForm states={states} />
          </CardContent>
        </Card>
      )}
    </AdminPage>
  );
}
