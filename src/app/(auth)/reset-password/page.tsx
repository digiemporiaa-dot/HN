import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { buttonStyles, Card, CardContent } from "@/components/ui";
import { getCurrentStaff } from "@/server/auth/guards";
import { findUsableResetToken } from "@/server/auth/password-reset";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  // The token is in the address: it must not travel on to another site.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  if (await getCurrentStaff()) redirect("/admin");

  const { token: raw } = await searchParams;
  const token = typeof raw === "string" ? raw : "";
  // Looking only: the link is spent when the new password is saved.
  const record = await findUsableResetToken(token);

  return (
    <Card appearance="standard">
      <CardContent className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h3 text-ink">Choose a new password</h1>
          {record ? (
            <p className="text-body-sm text-ink-muted">
              For <span className="text-ink font-medium">{record.staff.email}</span>. Saving it
              signs you out everywhere; sign in again with the new password.
            </p>
          ) : null}
        </div>

        {record ? (
          <ResetPasswordForm token={token} email={record.staff.email} />
        ) : (
          <div className="flex flex-col gap-5">
            <div
              role="alert"
              className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                This reset link has expired or has already been used. Links work
                once, for 30 minutes.
              </span>
            </div>
            <Link href="/forgot-password" className={buttonStyles({ size: "lg", className: "w-full" })}>
              Request a new link
            </Link>
            <Link href="/login" className="text-body-sm text-ink-muted hover:text-ink text-center">
              Back to sign in
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
