import type { Metadata } from "next";
import Link from "next/link";

import {
  Badge,
  buttonStyles,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { SUPER_ADMIN_ROLE_KEY } from "@/server/permissions/catalogue";

export const metadata: Metadata = {
  title: "Roles & permissions",
  robots: { index: false, follow: false },
};

export default async function RolesPage() {
  await requirePermission("ROLES", "VIEW");
  const { can } = await currentPermissions();

  const roles = await prisma.role.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      _count: { select: { permissions: true, staff: true } },
    },
  });

  return (
    <AdminPage>
      <AdminPageHeader
        title="Roles & permissions"
        description="A role is a named set of permissions. Individual accounts can be adjusted from their own page without changing the role."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{role.name}</CardTitle>
                {role.isSystem ? <Badge tone="neutral">System</Badge> : null}
                {role.key === SUPER_ADMIN_ROLE_KEY ? (
                  <Badge tone="brand">Unrestricted</Badge>
                ) : null}
              </div>
              {role.description ? (
                <CardDescription>{role.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-caption text-ink-muted flex gap-4">
                <span>{role._count.permissions} permissions</span>
                <span>
                  {role._count.staff}{" "}
                  {role._count.staff === 1 ? "account" : "accounts"}
                </span>
              </div>
              <Link
                href={`/admin/roles/${role.id}`}
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                {can("ROLES", "EDIT") && role.key !== SUPER_ADMIN_ROLE_KEY
                  ? "Edit permissions"
                  : "View permissions"}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
