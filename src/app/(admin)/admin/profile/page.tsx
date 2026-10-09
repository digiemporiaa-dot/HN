import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import {
  Badge,
  buttonStyles,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { requireStaff } from "@/server/auth/guards";
import { describeUserAgent, listSessions } from "@/server/auth/sessions";
import { getTwoFactorStatus } from "@/server/auth/two-factor";
import {
  ProfileDetailsForm,
  ProfilePhotoForm,
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

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaff();
  const { "two-factor": twoFactorNotice } = await searchParams;

  const [twoFactor, sessions, record, photoAssets] = await Promise.all([
    getTwoFactorStatus(staff.id),
    listSessions(staff.id),
    prisma.staff.findUnique({
      where: { id: staff.id },
      select: { avatar: { select: { id: true, storageKey: true } } },
    }),
    prisma.mediaAsset.findMany({
      where: { deletedAt: null, kind: { in: ["IMAGE", "VECTOR"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, originalName: true, title: true },
    }),
  ]);

  const avatar = record?.avatar ?? null;
  const avatarUrl = avatar ? publicUrlForKey(avatar.storageKey) : null;
  const photoOptions = photoAssets.map((asset) => ({
    id: asset.id,
    label: asset.title ?? asset.originalName,
  }));

  return (
    <AdminPage>
      <AdminPageHeader
        title="My profile"
        description={staff.email}
        actions={<Badge tone="brand">{staff.roleName}</Badge>}
      />

      {twoFactorNotice === "required" && !twoFactor.enabled ? (
        <div
          role="alert"
          className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Your access requires two-factor authentication. Set it up below with
            an authenticator app; the rest of the admin opens once it is on.
          </span>
        </div>
      ) : null}

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
          <ProfilePhotoForm
            currentUrl={avatarUrl}
            currentAssetId={avatar?.id ?? null}
            options={photoOptions}
          />
        </CardContent>
      </Card>

      <span id="security" aria-hidden="true" className="-mb-8 block scroll-mt-28" />
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
              {twoFactor.unusedRecoveryCodes === 1 ? "code" : "codes"}{" "}
              remaining.
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
    </AdminPage>
  );
}
