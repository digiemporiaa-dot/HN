import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck, Users } from "lucide-react";

import {
  Badge,
  Button,
  buttonStyles,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
} from "@/components/ui";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { logoutAction } from "@/server/auth/actions";
import { currentPermissions } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Interim dashboard. Phase 6 replaces it with the full admin shell and Phase 45
 * adds real lead analytics — the counts here are only what already exists.
 */
export default async function AdminDashboardPage() {
  const { staff, can } = await currentPermissions();

  const [staffCount, roleCount] = await Promise.all([
    can("STAFF", "VIEW") ? prisma.staff.count() : Promise.resolve(null),
    can("ROLES", "VIEW") ? prisma.role.count() : Promise.resolve(null),
  ]);

  return (
    <Container className="flex flex-col gap-8 py-10">
      <AdminPageHeader
        title={`Welcome, ${staff.name.split(" ")[0]}`}
        description={`Signed in as ${staff.email}`}
        actions={
          <>
            <Badge tone="brand">{staff.roleName}</Badge>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {can("STAFF", "VIEW") ? (
          <Card interactive>
            <CardHeader>
              <span className="text-primary bg-primary-subtle w-fit rounded-md p-2">
                <Users aria-hidden="true" className="size-5" />
              </span>
              <CardTitle>Staff</CardTitle>
              <CardDescription>
                {staffCount} {staffCount === 1 ? "account" : "accounts"} with
                admin access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/staff"
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Manage staff
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {can("ROLES", "VIEW") ? (
          <Card interactive>
            <CardHeader>
              <span className="text-primary bg-primary-subtle w-fit rounded-md p-2">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <CardTitle>Roles &amp; permissions</CardTitle>
              <CardDescription>
                {roleCount} roles defining what each account can do.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/roles"
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Manage roles
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <Card interactive>
          <CardHeader>
            <span className="text-primary bg-primary-subtle w-fit rounded-md p-2">
              <KeyRound aria-hidden="true" className="size-5" />
            </span>
            <CardTitle>Your account</CardTitle>
            <CardDescription>
              Change your password. Doing so signs you out everywhere.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/change-password"
              className={buttonStyles({ variant: "outline", size: "sm" })}
            >
              Change password
            </Link>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
