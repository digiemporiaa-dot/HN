import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { buttonStyles, Card, CardContent } from "@/components/ui";
import { getCurrentStaff } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

export default async function AccessDeniedPage() {
  const staff = await getCurrentStaff();

  return (
    <Card appearance="standard">
      <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
        <span className="bg-danger-50 text-danger-600 rounded-full p-3">
          <ShieldAlert aria-hidden="true" className="size-6" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-h3 text-ink">Access denied</h1>
          <p className="text-body-sm text-ink-muted">
            Your account does not have permission to view that page. If you
            believe this is a mistake, contact an administrator.
          </p>
        </div>

        {staff ? (
          <p className="text-caption text-ink-subtle">
            Signed in as {staff.email} ({staff.roleName})
          </p>
        ) : null}

        <Link href="/admin" className={buttonStyles({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </CardContent>
    </Card>
  );
}
