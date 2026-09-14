import type { Metadata } from "next";
import Link from "next/link";

import {
  Badge,
  Button,
  buttonStyles,
  Card,
  CardContent,
  Container,
} from "@/components/ui";
import { logoutAction } from "@/server/auth/actions";
import { requireStaff } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Placeholder dashboard proving the protected route works end to end. Phase 6
 * replaces it with the real admin panel.
 */
export default async function AdminDashboardPage() {
  const staff = await requireStaff();

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-h2 text-ink">Dashboard</h1>
            <p className="text-body-sm text-ink-muted">
              Signed in as {staff.name}
            </p>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-subtle">Email</dt>
                <dd className="text-body-sm text-ink">{staff.email}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-subtle">Role</dt>
                <dd>
                  <Badge tone="brand">{staff.roleName}</Badge>
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-subtle">Status</dt>
                <dd>
                  <Badge tone="success">{staff.status}</Badge>
                </dd>
              </div>
            </dl>

            <div>
              <Link
                href="/change-password"
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Change password
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
