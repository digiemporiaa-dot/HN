import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  ACTION_LABELS,
  MODULE_LABELS,
  MODULE_ACTIONS,
  MODULE_ORDER,
  permissionKey,
  SUPER_ADMIN_ROLE_KEY,
} from "@/server/permissions/catalogue";
import { deleteStaffAction } from "@/server/staff/actions";
import { getTwoFactorStatus } from "@/server/auth/two-factor";
import {
  StaffDetailsForm,
  StaffOverridesForm,
  StaffPasswordResetForm,
  StaffStatusForm,
  StaffTwoFactorResetForm,
} from "./staff-manage-forms";

export const metadata: Metadata = {
  title: "Manage staff member",
  robots: { index: false, follow: false },
};

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("STAFF", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;

  const staff = await prisma.staff.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      roleId: true,
      lastLoginAt: true,
      mustChangePassword: true,
      createdAt: true,
      role: {
        select: {
          key: true,
          name: true,
          permissions: {
            select: { permission: { select: { module: true, action: true } } },
          },
        },
      },
      permissionOverrides: {
        select: {
          effect: true,
          permission: { select: { module: true, action: true } },
        },
      },
    },
  });

  if (!staff) notFound();

  const actorIsSuperAdmin = actor.roleKey === SUPER_ADMIN_ROLE_KEY;
  const targetIsSuperAdmin = staff.role.key === SUPER_ADMIN_ROLE_KEY;

  // Mirrors the server-side rule in the actions: only a Super Admin may act on
  // a Super Admin account.
  const mayEdit =
    can("STAFF", "EDIT") && (actorIsSuperAdmin || !targetIsSuperAdmin);
  const isSelf = actor.id === staff.id;

  const roles = await prisma.role.findMany({
    where: actorIsSuperAdmin ? {} : { key: { not: SUPER_ADMIN_ROLE_KEY } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const twoFactor = await getTwoFactorStatus(staff.id);

  const rolePermissions = staff.role.permissions.map((entry) =>
    permissionKey(entry.permission.module, entry.permission.action),
  );

  const overrides: Record<string, "GRANT" | "REVOKE"> = {};
  for (const override of staff.permissionOverrides) {
    overrides[
      permissionKey(override.permission.module, override.permission.action)
    ] = override.effect;
  }

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
        title={staff.name}
        description={staff.email}
        backHref="/admin/staff"
        backLabel="Staff"
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={staff.status} />
            <Badge tone="brand">{staff.role.name}</Badge>
          </div>
        }
      />

      {targetIsSuperAdmin && !actorIsSuperAdmin ? (
        <div className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm rounded-md border p-4">
          This is a Super Admin account. Only another Super Admin can modify it.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffDetailsForm
            staff={{
              id: staff.id,
              name: staff.name,
              email: staff.email,
              phone: staff.phone,
              roleId: staff.roleId,
            }}
            roles={roles}
            readOnly={!mayEdit}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account status</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffStatusForm
              staffId={staff.id}
              status={staff.status}
              disabled={!mayEdit || isSelf}
              disabledReason={
                isSelf
                  ? "You cannot change your own account status."
                  : "You do not have permission to change this account."
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {staff.mustChangePassword ? (
              <Badge tone="warning">Change required at next sign-in</Badge>
            ) : null}
            <StaffPasswordResetForm
              staffId={staff.id}
              disabled={!mayEdit}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffTwoFactorResetForm
            staffId={staff.id}
            enabled={twoFactor.enabled}
            disabled={!mayEdit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <p className="text-body-sm text-ink-muted">
            Inherited from {staff.role.name}. Tick or untick to grant or remove
            an individual permission for this account only.
          </p>
        </CardHeader>
        <CardContent>
          <StaffOverridesForm
            staffId={staff.id}
            modules={modules}
            rolePermissions={rolePermissions}
            overrides={overrides}
            readOnly={!mayEdit || targetIsSuperAdmin}
          />
        </CardContent>
      </Card>

      {can("STAFF", "DELETE") && mayEdit && !isSelf ? (
        <Card appearance="bordered">
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
            <p className="text-body-sm text-ink-muted">
              Permanently removes this account. Audit history is preserved
              against the recorded email address.
            </p>
          </CardHeader>
          <CardContent>
            <form action={deleteStaffAction}>
              <input type="hidden" name="staffId" value={staff.id} />
              <Button type="submit" variant="danger">
                Delete {staff.email}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </AdminPage>
  );
}
