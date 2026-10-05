/**
 * Checks the environment a production server is started with.
 *
 * Run once at boot (see src/instrumentation.ts). A misconfigured deploy stops
 * here with a list of what to fix, rather than starting and failing later in
 * ways that are harder to trace — sessions signed with a placeholder secret,
 * canonical URLs pointing at http, uploads written inside the container.
 *
 * Values are never echoed: only the variable names and what is wrong with them.
 */

const PLACEHOLDERS = new Set(["", "CHANGE_ME", "changeme", "secret"]);

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

export function environmentProblems(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const problems: string[] = [];

  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl) {
    problems.push("DATABASE_URL is not set.");
  } else if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    problems.push("DATABASE_URL must be a postgresql:// connection string.");
  }

  const secret = env.AUTH_SECRET?.trim() ?? "";
  if (PLACEHOLDERS.has(secret)) {
    problems.push(
      "AUTH_SECRET is not set. Generate one with: openssl rand -base64 32",
    );
  } else if (secret.length < 32) {
    problems.push(
      "AUTH_SECRET is too short; use at least 32 characters (openssl rand -base64 32).",
    );
  }

  const appUrl = env.APP_URL?.trim() ?? "";
  if (!appUrl) {
    problems.push("APP_URL is not set; it must be the site's public address.");
  } else {
    try {
      const url = new URL(appUrl);
      if (url.protocol !== "https:" && !isLocalHost(url.hostname)) {
        problems.push(
          "APP_URL must use https:// — it is written into canonical URLs, the sitemap and emails.",
        );
      }
      if (url.pathname !== "/" || url.search || url.hash) {
        problems.push(
          "APP_URL must be the bare origin, like https://example.com, with no path.",
        );
      }
    } catch {
      problems.push("APP_URL is not a valid URL.");
    }
  }

  const uploadRoot = env.UPLOAD_ROOT?.trim() ?? "";
  if (!uploadRoot) {
    problems.push("UPLOAD_ROOT is not set; it must point at the media volume.");
  } else if (!uploadRoot.startsWith("/")) {
    problems.push("UPLOAD_ROOT must be an absolute path.");
  }

  const backupRoot = env.BACKUP_ROOT?.trim();
  if (
    backupRoot !== undefined &&
    backupRoot !== "" &&
    !backupRoot.startsWith("/")
  ) {
    problems.push("BACKUP_ROOT must be an absolute path.");
  }

  return problems;
}
