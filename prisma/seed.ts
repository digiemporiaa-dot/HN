import "dotenv/config";

import { prisma } from "../src/server/db";
import {
  allPermissionPairs,
  permissionKey,
  SYSTEM_ROLES,
} from "../src/server/permissions/catalogue";

/**
 * Seeds the permission catalogue and the system roles.
 *
 * Idempotent and non-destructive: it adds what is missing and corrects role
 * permission sets, but never deletes staff, never touches passwords, and never
 * removes a role an administrator has created. Safe to run on every deploy.
 */
async function main() {
  const pairs = allPermissionPairs();

  for (const pair of pairs) {
    await prisma.permission.upsert({
      where: { module_action: { module: pair.module, action: pair.action } },
      update: {},
      create: { module: pair.module, action: pair.action },
    });
  }
  console.log(`Permissions ensured: ${pairs.length}`);

  const allPermissions = await prisma.permission.findMany({
    select: { id: true, module: true, action: true },
  });
  const permissionIdByKey = new Map(
    allPermissions.map((p) => [permissionKey(p.module, p.action), p.id]),
  );

  for (const definition of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { key: definition.key },
      update: {
        name: definition.name,
        description: definition.description,
        isSystem: true,
      },
      create: {
        key: definition.key,
        name: definition.name,
        description: definition.description,
        isSystem: true,
      },
      select: { id: true, key: true },
    });

    const desiredKeys =
      definition.permissions === "ALL"
        ? [...permissionIdByKey.keys()]
        : definition.permissions;

    const desiredIds = new Set(
      desiredKeys
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id)),
    );

    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((row) => row.permissionId));

    const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !desiredIds.has(id));

    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    if (toRemove.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId: { in: toRemove } },
      });
    }

    console.log(
      `Role ${role.key}: ${desiredIds.size} permissions (+${toAdd.length} / -${toRemove.length})`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(
      `Seed failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
