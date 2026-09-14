import type { Metadata } from "next";
import Link from "next/link";
import { ImageOff } from "lucide-react";

import {
  Badge,
  buttonStyles,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
} from "@/components/ui";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/server/auth/guards";
import { describeUserAgent, listSessions } from "@/server/auth/sessions";
import { getTwoFactorStatus } from "@/server/auth/two-factor";
import {
  ProfileDetailsForm,
  SessionList,
  TwoFactorSetup,
} from "./profile-forms";

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export default async function ProfilePage() {
  const staff = await requireStaff();

  const [twoFactor, sessions] = await Promise.all([
    getTwoFactorStatus(staff.id),
    listSessions(staff.id),
  ]);

  return (
    <Container className="flex flex-col gap-8 py-10">
      <AdminPageHeader
        title="My profile"
        description={staff.email}
        backHref="/admin"
        backLabel="Dashboard"
        actions={<Badge tone="brand">{staff.roleName}</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileDetailsForm
            name={staff.name}
            phone={staff.phone}
            email={staff.email}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile photo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-ink-muted text-body-sm flex items-center gap-3">
            <ImageOff aria-hidden="true" className="size-4 shrink-0" />
            <span>
              Photo uploads arrive with the media library, once persistent file
              storage is in place.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <p className="text-body-sm text-ink-muted">
            Changing your password signs you out of every device, including this
            one.
          </p>
        </CardHeader>
        <CardContent>
          <Link
            href="/change-password"
            className={buttonStyles({ variant: "outline" })}
          >
            Change password
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          {twoFactor.enabled ? (
            <p className="text-body-sm text-ink-muted">
              {twoFactor.unusedRecoveryCodes} unused recovery{" "}
              {twoFactor.unusedRecoveryCodes === 1 ? "code" : "codes"} remaining.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <TwoFactorSetup enabled={twoFactor.enabled} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <p className="text-body-sm text-ink-muted">
            Every device currently signed in to this account. Ending a session
            takes effect immediately.
          </p>
        </CardHeader>
        <CardContent>
          <SessionList
            currentSessionId={staff.sessionId}
            sessions={sessions.map((session) => ({
              id: session.id,
              device: describeUserAgent(session.userAgent),
              ipAddress: session.ipAddress,
              lastSeen: dateFormatter.format(session.lastSeenAt),
              signedInAt: dateFormatter.format(session.createdAt),
            }))}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
