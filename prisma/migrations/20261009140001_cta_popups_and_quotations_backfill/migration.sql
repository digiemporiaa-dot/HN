-- Permissions and quotation rows for the call-to-action popups and the
-- quotation workflow. Additive and idempotent: nothing is deleted or changed,
-- and nobody gains or loses access.
--
--   POPUPS:<action>              -> CTA_POPUPS:<action>
--     Whoever manages site popups manages the popups behind buttons too.
--   LEADS:ASSIGN and RFQ:EDIT    -> RFQ:ASSIGN
--     Until now, reassigning a quotation request needed exactly those two.
--
-- Staff overrides follow the same rules on the person's effective
-- permissions, so an override that gave or took away the old combination
-- gives or takes away the new permission.
--
-- Every existing quotation request (a lead whose source is RFQ) gets its
-- quotation row, with a status read from the lead's stage.
--
-- Recovery:
--   DELETE FROM "Permission" WHERE "module" = 'CTA_POPUPS'
--      OR ("module" = 'RFQ' AND "action" = 'ASSIGN');
--   (grants and overrides cascade), and
--   DELETE FROM "QuoteRequest" WHERE "id" LIKE 'qr_%';

-- 1. The permission rows.
INSERT INTO "Permission" ("id", "module", "action", "createdAt")
SELECT 'perm_' || lower(m."module") || '_' || lower(m."action"),
       m."module"::"PermissionModule", m."action"::"PermissionAction", CURRENT_TIMESTAMP
FROM (VALUES
    ('CTA_POPUPS', 'VIEW'),
    ('CTA_POPUPS', 'CREATE'),
    ('CTA_POPUPS', 'EDIT'),
    ('CTA_POPUPS', 'DELETE'),
    ('CTA_POPUPS', 'PUBLISH'),
    ('RFQ', 'ASSIGN')
  ) AS m("module", "action")
ON CONFLICT ("module", "action") DO NOTHING;

-- 2. Role grants: CTA popups follow popups, for every role.
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT DISTINCT rp."roleId", np."id", CURRENT_TIMESTAMP
FROM "RolePermission" rp
JOIN "Permission" op ON op."id" = rp."permissionId" AND op."module" = 'POPUPS'
JOIN "Permission" np ON np."module" = 'CTA_POPUPS' AND np."action" = op."action"
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 3. Role grants: RFQ assignment for roles holding both Leads Assign and RFQ Edit.
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r."id", np."id", CURRENT_TIMESTAMP
FROM "Role" r
JOIN "Permission" np ON np."module" = 'RFQ' AND np."action" = 'ASSIGN'
WHERE EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND p."module" = 'LEADS' AND p."action" = 'ASSIGN')
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND p."module" = 'RFQ' AND p."action" = 'EDIT')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 4. Overrides: CTA popups follow popups with the same effect.
INSERT INTO "StaffPermissionOverride" ("staffId", "permissionId", "effect", "createdAt")
SELECT o."staffId", np."id", o."effect", CURRENT_TIMESTAMP
FROM "StaffPermissionOverride" o
JOIN "Permission" op ON op."id" = o."permissionId" AND op."module" = 'POPUPS'
JOIN "Permission" np ON np."module" = 'CTA_POPUPS' AND np."action" = op."action"
ON CONFLICT ("staffId", "permissionId") DO NOTHING;

-- 5. Overrides: RFQ assignment, from each person's effective permissions.
--    Effective = role grant, plus a GRANT override, minus a REVOKE override.
--    Someone who could reassign quotation requests before and whose role does
--    not now carry RFQ Assign gets a GRANT; someone whose role now carries it
--    but who could not reassign before gets a REVOKE.
INSERT INTO "StaffPermissionOverride" ("staffId", "permissionId", "effect", "createdAt")
SELECT e."staffId", np."id",
       CASE WHEN e."could" THEN 'GRANT'::"PermissionEffect" ELSE 'REVOKE'::"PermissionEffect" END,
       CURRENT_TIMESTAMP
FROM (
  SELECT s."id" AS "staffId",
         (
           (EXISTS (SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p."id" = rp."permissionId"
                    WHERE rp."roleId" = s."roleId" AND p."module" = 'LEADS' AND p."action" = 'ASSIGN')
            OR EXISTS (SELECT 1 FROM "StaffPermissionOverride" o JOIN "Permission" p ON p."id" = o."permissionId"
                       WHERE o."staffId" = s."id" AND o."effect" = 'GRANT' AND p."module" = 'LEADS' AND p."action" = 'ASSIGN'))
           AND NOT EXISTS (SELECT 1 FROM "StaffPermissionOverride" o JOIN "Permission" p ON p."id" = o."permissionId"
                           WHERE o."staffId" = s."id" AND o."effect" = 'REVOKE' AND p."module" = 'LEADS' AND p."action" = 'ASSIGN')
           AND (EXISTS (SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p."id" = rp."permissionId"
                        WHERE rp."roleId" = s."roleId" AND p."module" = 'RFQ' AND p."action" = 'EDIT')
                OR EXISTS (SELECT 1 FROM "StaffPermissionOverride" o JOIN "Permission" p ON p."id" = o."permissionId"
                           WHERE o."staffId" = s."id" AND o."effect" = 'GRANT' AND p."module" = 'RFQ' AND p."action" = 'EDIT'))
           AND NOT EXISTS (SELECT 1 FROM "StaffPermissionOverride" o JOIN "Permission" p ON p."id" = o."permissionId"
                           WHERE o."staffId" = s."id" AND o."effect" = 'REVOKE' AND p."module" = 'RFQ' AND p."action" = 'EDIT')
         ) AS "could",
         EXISTS (SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p."id" = rp."permissionId"
                 WHERE rp."roleId" = s."roleId" AND p."module" = 'RFQ' AND p."action" = 'ASSIGN') AS "roleHas"
  FROM "Staff" s
) e
JOIN "Permission" np ON np."module" = 'RFQ' AND np."action" = 'ASSIGN'
WHERE e."could" <> e."roleHas"
ON CONFLICT ("staffId", "permissionId") DO NOTHING;

-- 6. A quotation row for every existing quotation request.
INSERT INTO "QuoteRequest" ("id", "leadId", "status", "statusChangedAt", "createdAt", "updatedAt")
SELECT 'qr_' || l."id", l."id",
       (CASE l."status"
          WHEN 'NEW' THEN 'NEW'
          WHEN 'CONTACTED' THEN 'UNDER_REVIEW'
          WHEN 'QUALIFIED' THEN 'UNDER_REVIEW'
          WHEN 'QUOTATION_SENT' THEN 'QUOTED'
          WHEN 'NEGOTIATION' THEN 'QUOTED'
          WHEN 'WON' THEN 'WON'
          WHEN 'LOST' THEN 'LOST'
          ELSE 'NEW'
        END)::"QuoteStatus",
       l."updatedAt", l."createdAt", CURRENT_TIMESTAMP
FROM "Lead" l
WHERE l."source" = 'RFQ'
ON CONFLICT ("leadId") DO NOTHING;
