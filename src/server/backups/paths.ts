import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Where backup archives live: a persistent volume outside the web root,
 * never served directly. Downloads go through an authorised route.
 */
export function backupRoot(): string {
  const configured = process.env.BACKUP_ROOT?.trim();
  if (!configured) {
    throw new Error(
      "BACKUP_ROOT is not set. It must point at a persistent volume, for example /data/hnmedical/backups.",
    );
  }
  if (!path.isAbsolute(configured)) {
    throw new Error("BACKUP_ROOT must be an absolute path.");
  }
  return path.resolve(configured);
}

export function backupConfigured(): boolean {
  try {
    backupRoot();
    return true;
  } catch {
    return false;
  }
}

/** Archive names are generated here and checked here; nothing else is a path. */
const ARCHIVE_NAME = /^hnmedical-\d{8}-\d{6}-[a-z-]+-[a-z0-9]{6}\.tar\.gz$/;

export function isArchiveName(name: string): boolean {
  return ARCHIVE_NAME.test(name);
}

/** The absolute path of an archive, refusing anything that is not one of ours. */
export function archivePath(name: string): string {
  if (!isArchiveName(name)) throw new Error("Not a backup archive name.");
  const root = backupRoot();
  const resolved = path.resolve(root, name);
  if (path.dirname(resolved) !== root) {
    throw new Error("Not a backup archive name.");
  }
  return resolved;
}

export function newArchiveName(kind: string, now = new Date()): string {
  // India time in the name, so the file list reads the way staff think.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const stamp = `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}${get("second")}`;
  const random = randomBytes(3).toString("hex");
  return `hnmedical-${stamp}-${kind.toLowerCase().replace(/_/g, "-")}-${random}.tar.gz`;
}
