import type { Prisma } from "@/generated/prisma/client";
import { PermissionModule } from "@/generated/prisma/enums";
import { parseIsoDate, parseIstDateTime } from "@/lib/dates/ist";

export const AUDIT_PERIODS = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

export type AuditFilters = {
  q?: string;
  module?: string;
  action?: string;
  days?: string;
  /** Calendar days in India, "YYYY-MM-DD", both inclusive. */
  from?: string;
  to?: string;
};

function single(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();
  return trimmed ? trimmed.slice(0, 200) : undefined;
}

export function readAuditFilters(
  params: Record<string, string | string[] | undefined>,
): AuditFilters {
  return {
    q: single(params.q),
    module: single(params.module),
    action: single(params.action),
    days: single(params.days),
    from: single(params.from),
    to: single(params.to),
  };
}

/** The same filters for the screen and for its export. */
export function auditWhere(filters: AuditFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.module && filters.module in PermissionModule) {
    where.module = filters.module as PermissionModule;
  }
  if (filters.action && /^[A-Z0-9_]+$/.test(filters.action)) {
    where.action = filters.action;
  }
  // A chosen range is whole days in India: from 00:00 IST on the first day
  // to the end of the last, never shifted by the server's time zone.
  const from = filters.from && parseIsoDate(filters.from) ? parseIstDateTime(`${filters.from}T00:00`) : null;
  const toStart = filters.to && parseIsoDate(filters.to) ? parseIstDateTime(`${filters.to}T00:00`) : null;
  const days = AUDIT_PERIODS.find((period) => period.value === filters.days);
  if (from || toStart) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(toStart ? { lt: new Date(toStart.getTime() + 24 * 60 * 60 * 1000) } : {}),
    };
  } else if (days) {
    where.createdAt = {
      gte: new Date(Date.now() - Number(days.value) * 24 * 60 * 60 * 1000),
    };
  }
  if (filters.q) {
    where.OR = [
      { actorEmail: { contains: filters.q, mode: "insensitive" } },
      { summary: { contains: filters.q, mode: "insensitive" } },
      { entityId: filters.q },
      { ipAddress: filters.q },
    ];
  }

  return where;
}

/** "BACKUP_RESTORED" → "Backup restored". */
export function actionLabel(action: string): string {
  const words = action.toLowerCase().split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
