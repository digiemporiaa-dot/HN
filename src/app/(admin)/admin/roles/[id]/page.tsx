import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge, Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, getEffectivePermissions, requirePermission } from "@/server/permissions";
import { SUPER_ADMIN_ROLE_KEY } from "@/server/permissions/catalogue";
import { ALL_PERMISSION_IDS, idForStorage, parsePermissionId } from "@/lib/permissions/registry";
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
  const { can, staff } = await currentPermissions();
  const { id } = await params;

  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      updatedAt: true,
      permissions: {
        select: { permission: { select: { module: true, action: true } } },
      },
      _count: { select: { staff: true } },
    },
  });

  if (!role) notFound();

  const isSuperAdmin = role.key === SUPER_ADMIN_ROLE_KEY;
  const readOnly = !can("ROLES", "EDIT") || isSuperAdmin;

  // Retired pairs still in the database are not shown: they grant nothing
  // and are dropped the next time the role is saved.
  const assigned = role.permissions.flatMap((entry) => {
    const id = idForStorage(entry.permission.module, entry.permission.action);
    return id ? [id] : [];
  });
  const retiredCount = role.permissions.length - assigned.length;

  // What this editor may change: everything for Super Admin, otherwise only
  // permissions they hold themselves (the server enforces the same).
  const actorIsSuperAdmin = staff.roleKey === SUPER_ADMIN_ROLE_KEY;
  const held = actorIsSuperAdmin ? null : await getEffectivePermissions(staff.id);
  const editable = held
    ? ALL_PERMISSION_IDS.filter((id) => held.has(parsePermissionId(id)!.storageKey))
    : ("*" as const);

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

      {retiredCount > 0 && !readOnly ? (
        <p className="border-line bg-surface-subtle text-body-sm text-ink-muted rounded-md border p-3">
          This role still carries {retiredCount} retired permission{retiredCount === 1 ? "" : "s"} that no screen
          uses any more. They grant nothing and are removed the next time you save.
        </p>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <RolePermissionsForm
            roleId={role.id}
            roleName={role.name}
            version={role.updatedAt.toISOString()}
            assigned={assigned}
            editable={editable}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
