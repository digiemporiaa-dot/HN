import { prisma } from "@/server/db";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

export type ThrottleResult =
  | { allowed: true }
  | { allowed: false; retryAfterMinutes: number };

function windowStart(): Date {
  return new Date(Date.now() - WINDOW_MINUTES * 60_000);
}

/**
 * Throttles by email and by IP independently.
 *
 * The per-email limit stops an attacker grinding one account; the looser
 * per-IP limit stops someone spraying one password across many accounts. Both
 * count only failures since the last success, so a legitimate user who signs in
 * correctly is not punished for earlier typos.
 */
export async function checkLoginThrottle(
  email: string,
  ipAddress: string | null,
): Promise<ThrottleResult> {
  const since = windowStart();

  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { email, successful: true, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // A password reset by email link also starts the count again: whoever
  // reset it has proved they hold the mailbox, and should not stay locked out
  // by the attempts that sent them to "forgot password".
  const lastReset = await prisma.auditLog.findFirst({
    where: { action: "AUTH_PASSWORD_RESET", actorEmail: email, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const countFrom = [since, lastSuccess?.createdAt, lastReset?.createdAt]
    .filter((date): date is Date => Boolean(date))
    .reduce((latest, date) => (date > latest ? date : latest));

  const emailFailures = await prisma.loginAttempt.count({
    where: {
      email,
      successful: false,
      createdAt: { gte: countFrom },
    },
  });

  if (emailFailures >= MAX_FAILURES_PER_EMAIL) {
    return { allowed: false, retryAfterMinutes: WINDOW_MINUTES };
  }

  if (ipAddress) {
    const ipFailures = await prisma.loginAttempt.count({
      where: { ipAddress, successful: false, createdAt: { gte: since } },
    });

    if (ipFailures >= MAX_FAILURES_PER_IP) {
      return { allowed: false, retryAfterMinutes: WINDOW_MINUTES };
    }
  }

  return { allowed: true };
}

export async function recordLoginAttempt(params: {
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  successful: boolean;
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email: params.email,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent?.slice(0, 512) ?? null,
      successful: params.successful,
    },
  });
}
