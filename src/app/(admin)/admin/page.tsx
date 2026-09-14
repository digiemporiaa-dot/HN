import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, UserCheck, Users } from "lucide-react";

import {
  buttonStyles,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MetricCard } from "@/components/admin/metric-card";
import { prisma } from "@/server/db";
import { currentPermissions } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Interim dashboard: it reports only what the database actually holds today.
 * Lead and RFQ analytics arrive with the modules that produce them.
 */
export default async function AdminDashboardPage() {
  const { staff, can } = await currentPermissions();

  const showStaffMetrics = can("STAFF", "VIEW");
  const showRoleMetrics = can("ROLES", "VIEW");

  const [staffCount, activeStaffCount, roleCount] = await Promise.all([
    showStaffMetrics ? prisma.staff.count() : Promise.resolve(null),
    showStaffMetrics
      ? prisma.staff.count({ where: { status: "ACTIVE" } })
      : Promise.resolve(null),
    showRoleMetrics ? prisma.role.count() : Promise.resolve(null),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title={`Welcome, ${staff.name.split(" ")[0]}`}
        description="Operational overview. Sales and content metrics appear here as those modules come online."
      />

      {showStaffMetrics || showRoleMetrics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showStaffMetrics ? (
            <>
              <MetricCard
                label="Staff accounts"
                value={staffCount ?? 0}
                icon={Users}
              />
              <MetricCard
                label="Active accounts"
                value={activeStaffCount ?? 0}
                hint="Able to sign in right now"
                icon={UserCheck}
              />
            </>
          ) : null}

          {showRoleMetrics ? (
            <MetricCard
              label="Roles"
              value={roleCount ?? 0}
              hint="Permission sets available to assign"
              icon={ShieldCheck}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {can("STAFF", "VIEW") ? (
          <Card interactive>
            <CardHeader>
              <CardTitle>Staff</CardTitle>
              <CardDescription>
                Create accounts, assign roles, adjust individual permissions and
                reset access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/staff"
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Manage staff
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {can("ROLES", "VIEW") ? (
          <Card interactive>
            <CardHeader>
              <CardTitle>Roles &amp; permissions</CardTitle>
              <CardDescription>
                Review what each role can do across every module of the
                platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/roles"
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Manage roles
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AdminPage>
  );
}
