import "dotenv/config";
import { randomBytes } from "node:crypto";

import { prisma } from "../src/server/db";
import { hashPassword } from "../src/server/auth/password";
import { emailSchema, passwordSchema } from "../src/lib/validation/auth";

/**
 * Creates the first SUPER_ADMIN account so the system can be signed into.
 *
 * Run once per environment:
 *   npm run bootstrap:admin -- --email you@example.com --name "Your Name"
 *
 * A password may be supplied with --password; otherwise a strong one is
 * generated and printed once. The script refuses to touch an existing account,
 * so it can never be used to take one over.
 *
 * The full role and permission matrix is seeded in Phase 4; this creates only
 * the single role the first account needs.
 */

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

function generatePassword(): string {
  // 24 url-safe characters — well beyond the policy minimum and easy to paste.
  return randomBytes(18).toString("base64url");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = emailSchema.safeParse(args.email ?? process.env.ADMIN_EMAIL);
  if (!email.success) {
    throw new Error(
      "A valid --email is required (or set ADMIN_EMAIL). Example: --email admin@example.com",
    );
  }

  const name = (args.name ?? process.env.ADMIN_NAME ?? "").trim();
  if (!name) {
    throw new Error('A --name is required. Example: --name "Priya Sharma"');
  }

  const existing = await prisma.staff.findUnique({
    where: { email: email.data },
    select: { id: true },
  });

  if (existing) {
    throw new Error(
      `An account already exists for ${email.data}. This script will not modify it.`,
    );
  }

  const suppliedPassword = args.password ?? process.env.ADMIN_PASSWORD;
  const password = suppliedPassword ?? generatePassword();
  const validPassword = passwordSchema.safeParse(password);
  if (!validPassword.success) {
    throw new Error(
      `Password rejected: ${validPassword.error.issues[0]?.message}`,
    );
  }

  const role = await prisma.role.upsert({
    where: { key: "SUPER_ADMIN" },
    update: {},
    create: {
      key: "SUPER_ADMIN",
      name: "Super Admin",
      description:
        "Unrestricted access, including backups, restore and role management.",
      isSystem: true,
    },
  });

  const staff = await prisma.staff.create({
    data: {
      email: email.data,
      name,
      passwordHash: await hashPassword(password),
      roleId: role.id,
      status: "ACTIVE",
      // Force a change on first sign-in when we generated the password, since
      // it has been printed to a terminal and may persist in shell history.
      mustChangePassword: !suppliedPassword,
    },
    select: { id: true, email: true },
  });

  console.log(`\nCreated SUPER_ADMIN account: ${staff.email}`);
  if (!suppliedPassword) {
    console.log(`Temporary password: ${password}`);
    console.log("You will be required to change it on first sign-in.\n");
  } else {
    console.log("Using the supplied password.\n");
  }
}

main()
  .catch((error: unknown) => {
    console.error(
      `\nBootstrap failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
