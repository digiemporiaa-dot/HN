import { prisma } from "@/server/db";

/**
 * Server-side record of each sign-in.
 *
 * JWT sessions carry no state the server can revoke, so the session id travels
 * in the token and is validated against this table on every protected request.
 * Revoking a row ends that one session without touching the others.
 */

export async function createSession(params: {
  staffId: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<string> {
  const session = await prisma.staffSession.create({
    data: {
      staffId: params.staffId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent?.slice(0, 512) ?? null,
    },
    select: { id: true },
  });

  return session.id;
}

export async function isSessionActive(
  sessionId: string,
  staffId: string,
): Promise<boolean> {
  const session = await prisma.staffSession.findFirst({
    where: { id: sessionId, staffId, revokedAt: null },
    select: { id: true },
  });
  return Boolean(session);
}

export async function touchSession(sessionId: string): Promise<void> {
  await prisma.staffSession
    .update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {
      // A revoked or deleted session is about to fail the active check anyway.
    });
}

export async function listSessions(staffId: string) {
  return prisma.staffSession.findMany({
    where: { staffId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
}

export async function revokeSession(
  sessionId: string,
  staffId: string,
): Promise<boolean> {
  const result = await prisma.staffSession.updateMany({
    where: { id: sessionId, staffId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count === 1;
}

export async function revokeOtherSessions(
  staffId: string,
  keepSessionId: string,
): Promise<number> {
  const result = await prisma.staffSession.updateMany({
    where: { staffId, revokedAt: null, id: { not: keepSessionId } },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/** Human-readable device summary. Deliberately coarse — this is not fingerprinting. */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /OPR\//.test(userAgent) ? "Opera"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : "Browser";

  const platform =
    /Windows/.test(userAgent) ? "Windows"
    : /Macintosh|Mac OS/.test(userAgent) ? "macOS"
    : /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad|iOS/.test(userAgent) ? "iOS"
    : /Linux/.test(userAgent) ? "Linux"
    : "Unknown platform";

  return `${browser} on ${platform}`;
}
