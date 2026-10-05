import { prisma } from "@/server/db";
import { getSettings } from "@/server/settings/service";
import { backupConfigured } from "./paths";
import {
  createBackup,
  failStaleBackups,
  pruneScheduledBackups,
} from "./service";

const TICK_MS = 10 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const STARTED = Symbol.for("hnmedical.backups.scheduler");
type SchedulerHolder = { [STARTED]?: boolean };

/**
 * The start of the slot the schedule falls in, or null when nothing is due
 * yet. Slots are in India time: daily at the set hour, or weekly on Sundays.
 * Exported for tests.
 */
export function currentSlot(
  now: Date,
  schedule: string,
  hour: number,
): Date | null {
  if (schedule !== "daily" && schedule !== "weekly") return null;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  if (schedule === "weekly" && ist.getUTCDay() !== 0) return null;
  if (ist.getUTCHours() < hour) return null;
  const slotIst = Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate(),
    hour,
  );
  return new Date(slotIst - IST_OFFSET_MS);
}

function readInteger(
  value: string | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
}

async function tick(): Promise<void> {
  if (!backupConfigured()) return;
  const settings = await getSettings();
  const schedule = settings["backups.schedule"] ?? "daily";
  const hour = readInteger(settings["backups.hour"], 2, 0, 23);
  const keep = readInteger(settings["backups.keep"], 14, 1, 365);

  const slot = currentSlot(new Date(), schedule, hour);
  if (!slot) return;

  // One attempt per slot. A failed attempt is not retried until the next
  // slot, so a full disk does not turn into a failure every ten minutes; the
  // Backups screen shows it.
  const attempted = await prisma.backup.findFirst({
    where: { kind: "SCHEDULED", startedAt: { gte: slot } },
    select: { id: true },
  });
  if (attempted) return;

  await createBackup({ kind: "SCHEDULED" });
  const removed = await pruneScheduledBackups(keep);
  console.info(
    `[backups] scheduled backup completed${removed ? `; ${removed} older removed` : ""}`,
  );
}

function runTick(): void {
  tick().catch((error) => {
    console.error(
      "[backups] scheduled backup failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  });
}

/** Starts the in-process schedule. Called once from instrumentation. */
export function startBackupScheduler(): void {
  const holder = globalThis as SchedulerHolder;
  if (holder[STARTED]) return;
  holder[STARTED] = true;

  const bootedAt = new Date();
  failStaleBackups(bootedAt).catch(() => {});

  // First look shortly after start, so a restart near the hour does not skip
  // the day; then every ten minutes.
  setTimeout(runTick, 60_000).unref();
  setInterval(runTick, TICK_MS).unref();
}
