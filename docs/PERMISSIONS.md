# Modules, resources and permissions

## Where things are defined

There is one definition: `src/lib/permissions/registry.ts`. It holds:

- the modules;
- each module's resources, and the actions each resource supports;
- the menu entries and Create shortcuts.

Everything else is derived from it:

| Consumer | File |
| --- | --- |
| Checks and seed shape (`MODULE_ACTIONS`, labels, order) | `src/server/permissions/catalogue.ts` |
| Admin menu, breadcrumbs and Create menu | `src/components/admin/navigation.ts` |
| Role editor and staff overrides screen | `src/app/(admin)/admin/roles/[id]`, `src/app/(admin)/admin/staff/[id]` |
| Saving rules | `src/server/permissions/changes.ts` |

`tests/permissions-registry.test.ts` checks that these stay in step.

## Hierarchy

```
Module (menu group)  →  Resource  →  Action   →  Role grant / staff override
sales                →  leads     →  assign
```

A permission is identified as `<module>.<resource>:<action>`, for example `catalogue.products:delete`.

The database still stores the `(PermissionModule, PermissionAction)` enum pair, for example `PRODUCTS:DELETE`. Existing rows, role grants and overrides therefore needed no rewrite.

| Module | Resource | Id | Stored as | Actions |
| --- | --- | --- | --- | --- |
| Overview | Dashboard | `overview.dashboard` | `DASHBOARD` | View |
| Sales | Leads | `sales.leads` | `LEADS` | View, Edit, Delete, Assign, Export |
| Sales | RFQs | `sales.rfqs` | `RFQ` | View, Edit, Delete, Export |
| Catalogue | Products | `catalogue.products` | `PRODUCTS` | View, Create, Edit, Delete, Publish |
| Catalogue | Categories & subcategories | `catalogue.categories` | `CATEGORIES` | View, Create, Edit, Delete, Publish |
| Catalogue | Brands | `catalogue.brands` | `BRANDS` | View, Create, Edit, Delete, Publish |
| Catalogue | Specialties | `catalogue.specialties` | `SPECIALTIES` | View, Create, Edit, Delete, Publish |
| Catalogue | Solutions | `catalogue.solutions` | `SOLUTIONS` | View, Create, Edit, Delete, Publish |
| Catalogue | Applications | `catalogue.applications` | `APPLICATIONS` | View, Create, Edit, Delete |
| Content | Pages | `content.pages` | `PAGES` | View, Create, Edit, Delete, Publish |
| Content | Blog | `content.blogs` | `BLOGS` | View, Create, Edit, Delete, Publish |
| Content | Navigation | `content.navigation` | `NAVIGATION` | View, Edit |
| Content | Media | `content.media` | `MEDIA` | View, Create, Edit, Delete |
| Content | Forms | `content.forms` | `FORMS` | View, Create, Edit, Delete |
| Content | Popups | `content.popups` | `POPUPS` | View, Create, Edit, Delete, Publish |
| SEO | Page metadata | `seo.metadata` | `SEO` | View, Edit, Publish |
| SEO | Redirects | `seo.redirects` | `SEO_REDIRECTS` | View, Create, Edit, Delete |
| SEO | Not-found monitor | `seo.not_found` | `SEO_NOT_FOUND` | View, Edit |
| SEO | Indexation report | `seo.indexation` | `SEO_INDEXATION` | View |
| SEO | Location pages | `seo.locations` | `LOCATIONS` | View, Create, Edit, Delete, Publish |
| System | Staff | `system.staff` | `STAFF` | View, Create, Edit, Delete |
| System | Roles & permissions | `system.roles` | `ROLES` | View, Edit |
| System | Backups | `system.backups` | `BACKUPS` | View, Create, Delete, Restore, Export |
| System | Audit logs | `system.audit_logs` | `AUDIT_LOGS` | View, Export |
| System | Settings | `system.settings` | `SETTINGS` | View, Manage settings |

Notes on specific resources:

- **Subcategories** is a menu entry on the categories resource. It is one tree shown on two screens, so it has no permission set of its own.
- **RFQs** are leads whose source is RFQ. Editing, deleting or reassigning one needs the Leads action *and* the matching RFQ action. Both are checked on the server.
- **Sitemap and structured data** are generated automatically, and nothing in the admin edits them. There is therefore no resource for them; one would be added with the screen.

## Resolution rules

1. A permission covers one resource and one action, and nothing more.
   - Products View does not include Products Delete.
   - SEO metadata does not include redirects.
   - A module or a resource never implies its children.
2. Every other action on a resource requires that resource's View.
   - The role editor ticks View for you.
   - The server refuses to save anything else.
3. Effective permissions are built as follows:
   - start with the role's grants;
   - add the staff member's GRANT overrides;
   - remove their REVOKE overrides — **REVOKE always wins**;
   - Super Admin holds everything.
4. Anything not in the registry grants nothing and is refused when saving: an unknown key, a malformed key, or a retired pair still in the database. This fails closed.
5. Permissions are read from the database on every request.
   - A role or override change applies from the person's next page load.
   - Nobody needs to sign out.
   - Sessions are still ended by the existing `tokenVersion` mechanism on password change, deactivation and similar events.
6. The menu only offers what the viewer may see; it is not access control. Every page, server action and API route calls `requirePermission` (or `requireAnyPermission` for the SEO overview) itself.
   - The test suite checks that each menu entry's page is guarded by the permission that shows it.
   - The test suite also checks that no menu link points at a missing page.

## Saving rules

These apply to both role saves and staff override saves (`src/server/permissions/changes.ts`).

- Only registry ids are accepted, and unknown ones are named in the error.
- An actor who is not Super Admin may only change (grant **or** remove) permissions they hold themselves. Permissions they do not hold stay exactly as they are.
- Super Admin's role cannot be edited, and overrides do not apply to Super Admin accounts.
- A role save is one transaction.
  - It claims the version the editor loaded, so a save made by someone else in between makes the later save fail instead of silently overwriting it.
  - Retired pairs on the role are dropped and listed.
- The audit log records:
  - who made the change;
  - the granted and revoked ids;
  - any retired pairs dropped;
  - for overrides, every changed id.

## Retired pairs

Older seeds granted these pairs, but no screen or action ever checked them:

- `LEADS:CREATE`
- `PRODUCTS:EXPORT`
- `FORMS:EXPORT`
- `ROLES:CREATE`
- `ROLES:DELETE`

They are no longer grantable and grant nothing. They stay in the database untouched until a role holding one is saved.

## Migrations in this change

1. `20261009121900_permission_resources` adds the enum values `SEO_REDIRECTS`, `SEO_NOT_FOUND` and `SEO_INDEXATION`.
2. `20261009121901_permission_resources_backfill` adds their permission rows, and grants and overrides them from the SEO permission that used to cover them:

   ```
   SEO:VIEW -> SEO_REDIRECTS:VIEW, SEO_NOT_FOUND:VIEW, SEO_INDEXATION:VIEW
   SEO:EDIT -> SEO_REDIRECTS:CREATE, SEO_REDIRECTS:EDIT, SEO_REDIRECTS:DELETE, SEO_NOT_FOUND:EDIT
   ```

   - This applies to every role, system or custom, and to every staff override with the same effect (REVOKE wins on a clash).
   - It is additive and idempotent: nothing is deleted or changed, so nobody gains or loses access.

### Recovery

- To undo the data migration, run:

  ```sql
  DELETE FROM "Permission" WHERE "module" IN ('SEO_REDIRECTS','SEO_NOT_FOUND','SEO_INDEXATION');
  ```

  Their grants and overrides cascade. The SEO rows were never touched.
- The enum values can stay: unused enum values are harmless.
- Reverting the code without running that delete is also safe. The old code checks `SEO:EDIT` for redirects, which every affected role still has.

## Adding a module or resource

1. Add the resource (and any menu entry) to `MODULES` in the registry.
2. If it needs a new stored value, add it to `PermissionModule` in `prisma/schema.prisma`, then write two migrations: one adding the enum value, and one inserting its `Permission` rows and any default grants.
3. Add the default grants to `SYSTEM_ROLES` in `catalogue.ts`.
4. Guard the page and its actions with `requirePermission`.
5. Run `npm test`. The registry tests fail if any of the above is missing.
