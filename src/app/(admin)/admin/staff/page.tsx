import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";

import {
  buttonStyles,
  Card,
  Container,
  EmptyState,
  StatusBadge,
} from "@/components/ui";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

function formatDate(value: Date | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export default async function StaffListPage() {
  await requirePermission("STAFF", "VIEW");
  const { can } = await currentPermissions();

  const staff = await prisma.staff.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      lastLoginAt: true,
      mustChangePassword: true,
      role: { select: { name: true } },
    },
  });

  return (
    <Container className="flex flex-col gap-8 py-10">
      <AdminPageHeader
        title="Staff"
        description="Accounts that can sign in to the admin area. Access is determined by the assigned role, adjusted by any per-account permission overrides."
        backHref="/admin"
        backLabel="Dashboard"
        actions={
          can("STAFF", "CREATE") ? (
            <Link href="/admin/staff/new" className={buttonStyles()}>
              <UserPlus aria-hidden="true" className="size-4" />
              Add staff member
            </Link>
          ) : null
        }
      />

      {staff.length === 0 ? (
        <EmptyState
          title="No staff accounts yet"
          description="Create the first account to give a colleague access to the admin area."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <thead>
                <tr className="border-line bg-surface-subtle border-b">
                  <th scope="col" className="text-label text-ink-muted px-5 py-3">
                    Name
                  </th>
                  <th scope="col" className="text-label text-ink-muted px-5 py-3">
                    Role
                  </th>
                  <th scope="col" className="text-label text-ink-muted px-5 py-3">
                    Status
                  </th>
                  <th scope="col" className="text-label text-ink-muted px-5 py-3">
                    Last sign-in
                  </th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-body-sm text-ink font-medium">
                          {member.name}
                        </span>
                        <span className="text-caption text-ink-muted">
                          {member.email}
                        </span>
                      </div>
                    </td>
                    <td className="text-body-sm text-ink-muted px-5 py-4">
                      {member.role.name}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={member.status} />
                        {member.mustChangePassword ? (
                          <span className="text-caption text-warning-700">
                            Password change required
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-body-sm text-ink-muted px-5 py-4">
                      {formatDate(member.lastLoginAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/staff/${member.id}`}
                        className={buttonStyles({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        {can("STAFF", "EDIT") ? "Manage" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Container>
  );
}
