import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 connects through a driver adapter rather than a URL in the schema,
 * so the connection string is read here and passed explicitly.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and provide a PostgreSQL connection string.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Reused across hot reloads in development, where each recompile would
 * otherwise open a new connection pool and exhaust the database.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

/**
 * Whether this is a production build with no database to reach.
 *
 * Coolify builds the image before the application is linked to its database,
 * so the build cannot query it. With BUILD_WITHOUT_DATABASE=1 (set only in the
 * Dockerfile's build stage) and only during `next build`, every read answers
 * as an empty database would and every write fails. Pages prerender as if the
 * site were empty; the container's start-up warm-up replaces them with real
 * ones before it reports healthy, and they refresh on every save after that.
 * Nothing at runtime ever takes this path.
 */
const offlineBuild =
  process.env.NEXT_PHASE === "phase-production-build" &&
  process.env.BUILD_WITHOUT_DATABASE === "1";

const EMPTY_READS: Record<string, () => unknown> = {
  findMany: () => [],
  findFirst: () => null,
  findUnique: () => null,
  count: () => 0,
  groupBy: () => [],
  aggregate: () => ({ _sum: {}, _count: {}, _avg: {}, _min: {}, _max: {} }),
};

function offlineClient(): ReturnType<typeof createPrismaClient> {
  const refuse = (what: string) => () =>
    Promise.reject(new Error(`No database during the build: ${what}`));
  const delegate = (model: string) =>
    new Proxy(
      {},
      {
        get: (_target, method: string) =>
          method in EMPTY_READS
            ? () => Promise.resolve(EMPTY_READS[method]())
            : refuse(`${model}.${method}`),
      },
    );
  return new Proxy({} as ReturnType<typeof createPrismaClient>, {
    get: (_target, key: string) =>
      key === "$disconnect" || key === "$connect"
        ? () => Promise.resolve()
        : key.startsWith("$")
          ? refuse(key)
          : delegate(key),
  });
}

export const prisma = offlineBuild
  ? offlineClient()
  : (globalForPrisma.prisma ?? createPrismaClient());

if (!offlineBuild && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
