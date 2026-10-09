import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui";
import { getCurrentStaff } from "@/server/auth/guards";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  if (await getCurrentStaff()) redirect("/admin");

  return (
    <Card appearance="standard">
      <CardContent className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h3 text-ink">Forgot your password?</h1>
          <p className="text-body-sm text-ink-muted">
            Enter the email address you sign in with. We will send a link to
            choose a new password.
          </p>
        </div>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
