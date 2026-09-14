import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { getCurrentStaff } from "@/server/auth/guards";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

const NOTICES = {
  "session-expired": {
    icon: Clock,
    tone: "neutral",
    message: "Your session has ended. Please sign in again.",
  },
  "password-changed": {
    icon: CheckCircle2,
    tone: "success",
    message: "Your password has been updated. Sign in with your new password.",
  },
} as const;

type NoticeKey = keyof typeof NOTICES;

function isNoticeKey(value: string | undefined): value is NoticeKey {
  return value !== undefined && value in NOTICES;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const staff = await getCurrentStaff();
  if (staff) redirect("/admin");

  const { reason } = await searchParams;
  const notice = isNoticeKey(reason) ? NOTICES[reason] : null;
  const NoticeIcon = notice?.icon;

  return (
    <Card appearance="standard">
      <CardContent className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h3 text-ink">Staff sign in</h1>
          <p className="text-body-sm text-ink-muted">
            Access is restricted to authorised HN Medical System staff.
          </p>
        </div>

        {notice && NoticeIcon ? (
          <div
            className={
              notice.tone === "success"
                ? "border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
                : "border-line bg-surface-subtle text-ink-muted text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
            }
          >
            <NoticeIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{notice.message}</span>
          </div>
        ) : null}

        <LoginForm />
      </CardContent>
    </Card>
  );
}
