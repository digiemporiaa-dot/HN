-- Popup permissions for databases that already exist.
--
-- Production images do not run prisma/seed.ts, so a new module's permission
-- rows and its system-role grants arrive here. Kept apart from the migration
-- that adds the 'POPUPS' enum value: PostgreSQL refuses to use a value added
-- in the same transaction. Additive and idempotent: nothing is removed, and a
-- role an administrator created is never touched.

INSERT INTO "Permission" ("id", "module", "action", "createdAt")
SELECT 'perm_popups_' || lower(a.action), 'POPUPS'::"PermissionModule", a.action::"PermissionAction", CURRENT_TIMESTAMP
FROM (VALUES ('VIEW'), ('CREATE'), ('EDIT'), ('DELETE'), ('PUBLISH')) AS a(action)
ON CONFLICT ("module", "action") DO NOTHING;

-- Matches SYSTEM_ROLES in src/server/permissions/catalogue.ts. Sales roles get
-- nothing: a popup is site content, not part of the pipeline.
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "Role" r
JOIN "Permission" p ON p."module" = 'POPUPS'
WHERE r."isSystem" = true
  AND (
    r."key" IN ('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')
    OR (r."key" IN ('SEO_MANAGER', 'VIEWER') AND p."action" = 'VIEW')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
