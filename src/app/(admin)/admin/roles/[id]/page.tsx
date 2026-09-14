import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge, Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  ACTION_LABELS,
  MODULE_ACTIONS,
  MODULE_LABELS,
  MODULE_ORDER,
  permissionKey,
  SUPER_ADMIN_ROLE_KEY,
} from "@/server/permissions/catalogue";
import { RolePermissionsForm } from "./role-permissions-form";

export const metadata: Metadata = {
  title: "Role permissions",
  robots: { index: false, follow: false },
};

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("ROLES", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;

  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: {
        select: { permission: { select: { module: true, action: true } } },
      },
      _count: { select: { staff: true } },
    },
  });

  if (!role) notFound();

  const isSuperAdmin = role.key === SUPER_ADMIN_ROLE_KEY;
  const readOnly = !can("ROLES", "EDIT") || isSuperAdmin;

  const assigned = role.permissions.map((entry) =>
    permissionKey(entry.permission.module, entry.permission.action),
  );

  const modules = MODULE_ORDER.map((module) => ({
    module,
    label: MODULE_LABELS[module],
    actions: MODULE_ACTIONS[module].map((action) => ({
      action,
      label: ACTION_LABELS[action],
      key: permissionKey(module, action),
    })),
  }));

  return (
    <AdminPage>
      <AdminPageHeader
        title={role.name}
        description={role.description ?? undefined}
        backHref="/admin/roles"
        backLabel="Roles & permissions"
        actions={
          <div className="flex items-center gap-2">
            {role.isSystem ? <Badge tone="neutral">System</Badge> : null}
            <Badge tone="info">
              {role._count.staff}{" "}
              {role._count.staff === 1 ? "account" : "accounts"}
            </Badge>
          </div>
        }
      />

      {isSuperAdmin ? (
        <div className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm rounded-md border p-4">
          Super Admin always holds every permission and cannot be edited. If it
          could be narrowed, the platform could be locked out of its own
          administration.
        </div>
      ) : null}

      <Card>
        <CardContent>
          <RolePermissionsForm
            roleId={role.id}
            modules={modules}
            assigned={assigned}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
