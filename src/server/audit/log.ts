import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/server/db";

/**
 * Keys that must never reach the audit log, checked at every nesting level.
 * The audit trail is read by staff and exported during investigations, so a
 * secret written here would be a durable leak.
 */
const REDACTED_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "twofactorsecret",
  "recoverycode",
  "recoverycodes",
  "authsecret",
  "databaseurl",
  "apikey",
  "authorization",
  "cookie",
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? "[redacted]"
      : sanitize(item, depth + 1);
  }
  return result;
}

export type AuditEvent = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  module?: Prisma.AuditLogCreateInput["module"];
  entityType?: string | null;
  entityId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Writes one append-only audit row. Never throws into the caller: losing an
 * audit write must not take down the operation being audited, but it must be
 * visible in the logs.
 */
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: event.actorId ?? null,
        actorEmail: event.actorEmail ?? null,
        action: event.action,
        module: event.module,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        summary: event.summary ?? null,
        metadata: event.metadata
          ? (sanitize(event.metadata) as Prisma.InputJsonValue)
          : undefined,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent?.slice(0, 512) ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log entry", {
      action: event.action,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
