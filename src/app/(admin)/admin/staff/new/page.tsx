import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/permissions";
import { SUPER_ADMIN_ROLE_KEY } from "@/server/permissions/catalogue";
import { StaffCreateForm } from "./staff-create-form";

export const metadata: Metadata = {
  title: "Add staff member",
  robots: { index: false, follow: false },
};

export default async function NewStaffPage() {
  const actor = await requirePermission("STAFF", "CREATE");

  const roles = await prisma.role.findMany({
    where:
      actor.roleKey === SUPER_ADMIN_ROLE_KEY
        ? {}
        : // The list is filtered for usability; the action re-checks regardless.
          { key: { not: SUPER_ADMIN_ROLE_KEY } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="Add staff member"
        description="The account is created with a temporary password and must set a new one at first sign-in."
        backHref="/admin/staff"
        backLabel="Staff"
      />

      <Card>
        <CardContent>
          <StaffCreateForm roles={roles} />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
