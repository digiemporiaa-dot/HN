/**
 * Runs once when the server process starts.
 *
 * In production it refuses to start with a broken environment (see
 * src/server/env-check.ts), then starts the backup schedule. Development and
 * the build itself are left alone: a developer's .env is not a deploy, and
 * the image is built without secrets.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { environmentProblems } = await import("./server/env-check");
  const problems = environmentProblems();
  if (problems.length > 0) {
    console.error(
      [
        "The server cannot start: the environment is not configured correctly.",
        ...problems.map((problem) => `  - ${problem}`),
        "See DEPLOYMENT.md, section “Environment variables”.",
      ].join("\n"),
    );
    process.exit(1);
  }

  // Scheduled backups run inside the application process: one container,
  // no separate cron to configure. See Settings → Backups.
  const { startBackupScheduler } = await import("./server/backups/scheduler");
  startBackupScheduler();
}
