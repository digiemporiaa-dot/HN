-- SEO split: redirects, the not-found monitor and the indexation report
-- become resources of their own. "SEO" itself now means page metadata.
--
-- Additive only. No row is deleted or changed: every role grant and staff
-- override on SEO stays exactly as it was, and the new resources are granted
-- (or revoked) to whoever held the SEO permission that used to cover them,
-- so nobody gains or loses access in this migration.
--
--   SEO:VIEW -> SEO_REDIRECTS:VIEW, SEO_NOT_FOUND:VIEW, SEO_INDEXATION:VIEW
--   SEO:EDIT -> SEO_REDIRECTS:CREATE, SEO_REDIRECTS:EDIT, SEO_REDIRECTS:DELETE,
--               SEO_NOT_FOUND:EDIT
--
-- Kept apart from the migration that adds the enum values: PostgreSQL
-- refuses to use a value added in the same transaction.
--
-- Recovery: the new rows can be removed with
--   DELETE FROM "Permission" WHERE "module" IN ('SEO_REDIRECTS','SEO_NOT_FOUND','SEO_INDEXATION');
-- (grants and overrides cascade). Nothing else needs undoing.

-- The mapping is repeated inline in each statement: Prisma runs them one by
-- one, so a temporary table would not outlive its own statement.

-- 1. The permission rows themselves.
INSERT INTO "Permission" ("id", "module", "action", "createdAt")
SELECT DISTINCT 'perm_' || lower(m."toModule") || '_' || lower(m."toAction"),
       m."toModule"::"PermissionModule", m."toAction"::"PermissionAction", CURRENT_TIMESTAMP
FROM (VALUES
    ('VIEW', 'SEO_REDIRECTS', 'VIEW'),
    ('VIEW', 'SEO_NOT_FOUND', 'VIEW'),
    ('VIEW', 'SEO_INDEXATION', 'VIEW'),
    ('EDIT', 'SEO_REDIRECTS', 'CREATE'),
    ('EDIT', 'SEO_REDIRECTS', 'EDIT'),
    ('EDIT', 'SEO_REDIRECTS', 'DELETE'),
    ('EDIT', 'SEO_NOT_FOUND', 'EDIT')
  ) AS m("fromAction", "toModule", "toAction")
ON CONFLICT ("module", "action") DO NOTHING;

-- 2. Role grants follow the SEO grant that covered them, for every role,
--    system or custom.
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT DISTINCT rp."roleId", np."id", CURRENT_TIMESTAMP
FROM "RolePermission" rp
JOIN "Permission" op ON op."id" = rp."permissionId" AND op."module" = 'SEO'
JOIN (VALUES
    ('VIEW', 'SEO_REDIRECTS', 'VIEW'),
    ('VIEW', 'SEO_NOT_FOUND', 'VIEW'),
    ('VIEW', 'SEO_INDEXATION', 'VIEW'),
    ('EDIT', 'SEO_REDIRECTS', 'CREATE'),
    ('EDIT', 'SEO_REDIRECTS', 'EDIT'),
    ('EDIT', 'SEO_REDIRECTS', 'DELETE'),
    ('EDIT', 'SEO_NOT_FOUND', 'EDIT')
  ) AS m("fromAction", "toModule", "toAction") ON m."fromAction" = op."action"::TEXT
JOIN "Permission" np ON np."module" = m."toModule"::"PermissionModule" AND np."action" = m."toAction"::"PermissionAction"
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 3. Staff overrides carry over with the same effect: a GRANT of SEO:EDIT
--    grants the redirect and monitor edits, a REVOKE of SEO:VIEW revokes the
--    three views. An override already present on a new pair is left alone,
--    and if two map to one pair the REVOKE wins.
INSERT INTO "StaffPermissionOverride" ("staffId", "permissionId", "effect", "createdAt")
SELECT DISTINCT ON (o."staffId", np."id") o."staffId", np."id", o."effect", CURRENT_TIMESTAMP
FROM "StaffPermissionOverride" o
JOIN "Permission" op ON op."id" = o."permissionId" AND op."module" = 'SEO'
JOIN (VALUES
    ('VIEW', 'SEO_REDIRECTS', 'VIEW'),
    ('VIEW', 'SEO_NOT_FOUND', 'VIEW'),
    ('VIEW', 'SEO_INDEXATION', 'VIEW'),
    ('EDIT', 'SEO_REDIRECTS', 'CREATE'),
    ('EDIT', 'SEO_REDIRECTS', 'EDIT'),
    ('EDIT', 'SEO_REDIRECTS', 'DELETE'),
    ('EDIT', 'SEO_NOT_FOUND', 'EDIT')
  ) AS m("fromAction", "toModule", "toAction") ON m."fromAction" = op."action"::TEXT
JOIN "Permission" np ON np."module" = m."toModule"::"PermissionModule" AND np."action" = m."toAction"::"PermissionAction"
ORDER BY o."staffId", np."id", (o."effect" = 'REVOKE') DESC
ON CONFLICT ("staffId", "permissionId") DO NOTHING;
