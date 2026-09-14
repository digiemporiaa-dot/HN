import type { Metadata } from "next";
import { KeyRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { requireStaff } from "@/server/auth/guards";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "Change password",
  robots: { index: false, follow: false },
};

export default async function ChangePasswordPage() {
  const staff = await requireStaff();

  return (
    <Card appearance="standard">
      <CardContent className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h3 text-ink">Change password</h1>
          <p className="text-body-sm text-ink-muted">
            Signed in as {staff.email}
          </p>
        </div>

        {staff.mustChangePassword ? (
          <div className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5">
            <KeyRound aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              You must set a new password before continuing to the admin area.
            </span>
          </div>
        ) : null}

        <p className="text-caption text-ink-subtle">
          Changing your password signs you out of every device, including this
          one.
        </p>

        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
