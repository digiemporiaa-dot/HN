import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration. Only the CLI (migrate, generate, studio) reads this
 * file — the application itself connects through the driver adapter in
 * src/server/db.ts.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
