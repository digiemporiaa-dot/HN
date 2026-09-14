# HN Medical System — Implementation Plan

**Document status:** Phase 0 deliverable (Repository Audit & Architecture)
**Last updated:** 2026-09-14
**Repository:** `digiemporiaa-dot/HN`
**Working branch:** `claude/inspiring-maxwell-ntp3kz`

This document is the architectural contract for the HN Medical System platform. It records
the current state of the repository, the target architecture, and the phase-by-phase route
to production. It is intended to be updated at the end of each phase.

---

## 1. Current Project State

### 1.1 Repository snapshot

The repository was **empty at session start** — no commits, no files, no history. The only
commit present is the one created during this session:

```
a497643  Scaffold Next.js 15 + TypeScript + Tailwind foundation
```

There is **no pre-existing application** to audit, reuse, or preserve. There is no legacy
database, no production data, no existing users, and no prior deployment. This removes an
entire class of risk (migration of legacy data, backwards compatibility, refactor hazards)
and means the architecture below can be adopted directly rather than retrofitted.

### 1.2 Installed stack (verified)

| Component | Version | Source |
|---|---|---|
| Next.js | 15.5.25 | `package.json` |
| React / React DOM | 19.1.0 | `package.json` |
| TypeScript | 5.9.3 | resolved |
| Tailwind CSS | 4.3.3 | resolved |
| `@tailwindcss/postcss` | 4.3.3 | resolved |
| ESLint | 9.39.5 | resolved |
| `eslint-config-next` | 15.5.25 | `package.json` |
| Node.js (build env) | 22.22.2 | runtime |
| npm (build env) | 10.9.7 | runtime |

### 1.3 Current file tree (excluding `node_modules`, `.next`)

```
.gitignore
README.md              (create-next-app default — to be replaced)
eslint.config.mjs      (flat config, next/core-web-vitals + next/typescript)
next.config.ts         (empty config object)
package.json           (name: hn-medical-system)
package-lock.json
postcss.config.mjs     (@tailwindcss/postcss)
tsconfig.json          (strict: true, paths: @/* -> ./src/*)
public/                (default SVG assets — to be removed)
src/app/
  favicon.ico
  globals.css          (default Tailwind v4 theme block)
  layout.tsx           (Geist fonts, default metadata)
  page.tsx             (default Next.js landing page)
```

### 1.4 Configuration observations

- **Tailwind v4** is in use. There is **no `tailwind.config.js`** — v4 configures theme tokens
  via the `@theme` directive inside CSS. All design tokens must therefore live in CSS, not JS.
  This is a meaningful departure from Tailwind v3 patterns and affects Phase 1.
- **`tsconfig.json`** already has `strict: true` and the `@/*` path alias. Good baseline.
  `target: ES2017` should be raised to `ES2022` in Phase 1.
- **ESLint** uses flat config with `next/core-web-vitals` and `next/typescript`. Good baseline.
- **`next.config.ts`** is empty. Phase 1 must add `output: 'standalone'` (for Docker),
  image configuration, and security headers.
- **`.gitignore`** ignores `.env*` with **no exception for `.env.example`**. This is a blocker
  for Phase 1/53 (the example file must be committed). Fix: add `!.env.example`.
- The scaffold ships `Geist` fonts via `next/font/google`. Phase 1 replaces this with the
  chosen enterprise typeface, self-hosted via `next/font` to avoid render-blocking.

### 1.5 Verified working

- `npm run build` succeeds (production build, 5 static routes generated).
- ESLint config loads and runs as part of `next build`.

---

## 2. Existing Features

**None.** The application currently renders only the default `create-next-app` landing page.

For completeness, the following are *present but must be discarded* in Phase 1:
`src/app/page.tsx` (default landing page), `public/*.svg` (Next.js/Vercel logos),
`README.md` (create-next-app boilerplate), and the default `globals.css` theme block.

---

## 3. Missing Features

Everything in the specification. Grouped by domain, with the phase that delivers it:

| Domain | Missing | Phase |
|---|---|---|
| Design system | Tokens, typography, spacing, all UI primitives | 1 |
| Database | Prisma, schema, migrations, connection management | 2 |
| Auth | Login, sessions, password hashing, route protection | 3 |
| RBAC | Roles, permissions, server-side enforcement | 4 |
| Account | Profile, password change, 2FA readiness | 5 |
| Admin shell | Sidebar, header, data tables, responsive admin | 6 |
| Storage | Persistent VPS upload root, path safety | 7 |
| Media | Library, folders, metadata, upload validation | 8 |
| Settings | Global site settings, contact details, branding | 9 |
| CMS | Page builder, section registry, content/design split | 10 |
| Navigation | Header, mega menu, footer — all CMS-managed | 11 |
| Catalog | Categories, subcategories, brands, specialties, solutions | 12–16 |
| Products | Product CMS, dynamic specifications | 17–18 |
| Frontend | Homepage, product, category, location pages | 19–21, 28 |
| RFQ | Basket, quotation form | 22–23 |
| Forms | Form builder, submissions | 24 |
| CRM | Leads, assignment, timeline | 25–26 |
| Locations | States, cities, city × category pages | 27–30 |
| Programmatic SEO | Templates, thin-content guards, internal linking | 31–33 |
| SEO infra | SEO manager, sitemaps, robots, schema, redirects | 34–37 |
| Content | Blog, search, filtering, comparison, downloads | 38–42 |
| Analytics | UTM attribution, conversion events, dashboard | 43–45 |
| Audit | Immutable-style audit log | 46 |
| Backup | Backup, schedule, restore, download, security | 47–51 |
| Deployment | Docker, Coolify, healthcheck | 52–54 |
| Hardening | Performance, a11y, security, SEO, responsive QA | 55–59 |
| Validation | E2E tests, real restore test, production readiness | 60–62 |
| Docs | README, ARCHITECTURE, DEPLOYMENT, and others | 63 |

---

## 4. Proposed Architecture

### 4.1 Guiding principles

1. **Server-first.** React Server Components by default. Client Components only where
   interaction genuinely requires them (RFQ basket, filters, mega menu, admin forms,
   media manager). This directly serves the Core Web Vitals requirement.
2. **One source of truth per concern.** One button component, one input component, one
   section renderer, one permission check. No parallel implementations.
3. **Authorization at the data boundary, not the UI.** Every Server Action and Route Handler
   re-checks permissions server-side. Hidden navigation is a UX nicety, never a control.
4. **Guardrailed flexibility.** The CMS exposes *enumerated* design choices, never arbitrary
   CSS. Content editors cannot break the design system.
5. **Relational first, JSON only where justified.** JSON is used for exactly two things:
   section `content`/`design` payloads (genuinely polymorphic per section type) and audit
   log metadata. Everything else is normalized with foreign keys and indexes.
6. **No external object storage.** All media and backups live on persistent VPS volumes.

### 4.2 Directory structure

```
src/
  app/
    (site)/                     # Public website — RSC by default
      layout.tsx                # Header + footer, loaded from CMS
      page.tsx                  # Homepage — renders CMS sections
      products/
      categories/
      brands/
      specialties/
      solutions/
      locations/
      blog/
      rfq/
      search/
      compare/
      [...slug]/                # CMS catch-all — MUST be evaluated last
    (admin)/
      admin/
        layout.tsx              # Auth guard + dark sidebar shell
        dashboard/ leads/ rfqs/ products/ categories/ brands/
        specialties/ solutions/ locations/ pages/ blogs/ media/
        forms/ seo/ staff/ roles/ backups/ audit-logs/ settings/ profile/
    (auth)/
      login/ access-denied/
    api/
      auth/[...nextauth]/       # Auth.js handler
      health/                   # Healthcheck (Phase 54)
      media/upload/             # Multipart upload (Route Handler)
      media/file/[...path]/     # Guarded media serving
      backups/[id]/download/    # Authorized backup download
    sitemap.xml/ robots.txt/    # Dynamic SEO infrastructure

  components/
    ui/                         # Design system primitives (Phase 1)
    site/                       # Public composite components
    admin/                      # Admin composite components (DataTable etc.)

  cms/
    sections/                   # One folder per section type
    registry.ts                 # type -> { schema, renderer, editor, defaults }

  server/
    db.ts                       # Prisma client singleton
    auth/                       # Auth.js config, callbacks, guards
    permissions/                # RBAC definitions + requirePermission()
    services/                   # Domain logic (leads, rfq, seo, backup, media)
    repositories/               # Query layer — pagination, indexes, no N+1

  lib/
    validation/                 # Zod schemas (shared client/server)
    seo/                        # Template engine, schema.org builders
    storage/                    # Path resolution, traversal guards
    utils/                      # slugify, cn, formatters

  styles/
    tokens.css                  # Design tokens (@theme)

prisma/
  schema.prisma
  migrations/
  seed.ts
```

### 4.3 Data flow

- **Reads (public):** RSC → repository → Prisma → PostgreSQL, with `revalidate` tags per entity.
- **Writes (admin):** Server Action → Zod parse → `requirePermission()` → service → Prisma →
  audit log → `revalidateTag()`.
- **Uploads/downloads:** Route Handlers (multipart and streaming are unsuited to Server Actions).
- **Public form submissions:** Server Action → Zod → rate limit → lead service → notification.

---

## 5. Proposed Prisma Entities

Full schema is delivered in Phase 2. This is the entity model it will implement.

### 5.1 Identity, access control, security

| Model | Purpose | Key fields / notes |
|---|---|---|
| `Staff` | Staff account | `email` (unique), `passwordHash`, `status`, `roleId`, `tokenVersion`, `lastLoginAt`, `mustChangePassword` |
| `Role` | Named role | `key` (unique), `name`, `isSystem` |
| `Permission` | Atomic permission | `module`, `action`, unique `(module, action)` |
| `RolePermission` | Role → permission join | composite PK |
| `StaffPermissionOverride` | Per-staff grant/revoke | `effect: GRANT \| REVOKE` |
| `LoginAttempt` | Brute-force protection | `email`, `ip`, `success`, `createdAt` (indexed) |
| `StaffSession` | Active-session visibility/revocation | `jti`, `ip`, `userAgent`, `revokedAt` |
| `TwoFactorSecret` | TOTP readiness (Phase 5) | encrypted `secret`, `confirmedAt` |
| `RecoveryCode` | TOTP recovery | `codeHash`, `usedAt` |
| `AuditLog` | Immutable-style admin history | `actorId`, `action`, `entityType`, `entityId`, `metadata` (JSON, sanitized) |

**Session strategy note.** Auth.js v5 requires the **JWT** session strategy when using the
Credentials provider — database sessions are not supported for credentials. Forced logout is
therefore implemented via `Staff.tokenVersion` (incremented on password change, deactivation,
or role change; compared in the JWT callback). `StaffSession` provides the "active sessions"
UI and per-session revocation by `jti`. This is recorded here because it is a non-obvious
constraint that shapes Phases 3 and 5.

### 5.2 Media

| Model | Purpose |
|---|---|
| `MediaFolder` | Self-referencing folder tree (`parentId`, materialized `path`) |
| `MediaAsset` | File record: `storageKey`, `originalName`, `mimeType`, `sizeBytes`, `width`, `height`, `altText`, `title`, `caption`, `description`, `uploadedById` |
| `MediaUsage` | Reference tracking: `assetId`, `entityType`, `entityId`, `field` — powers the "in use" warning before deletion |

### 5.3 CMS

| Model | Purpose |
|---|---|
| `Page` | CMS page: `slug`, `title`, `status`, `publishedAt`, SEO relation |
| `PageSection` | `pageId`, `type` (enum), `order`, `enabled`, `anchorId`, `content` (JSON), `design` (JSON) |
| `NavigationMenu` | Header, footer, and mega-menu trees |
| `NavigationItem` | `menuId`, `parentId`, `label`, `href`, `order`, optional entity link, optional image |
| `SiteSetting` | Typed key/value global settings (company, contact, branding, analytics) |

`PageSection.content` and `.design` are the **only** JSON columns in the content model, and
each is validated by a per-section-type Zod schema in the registry. `design` accepts only
enumerated token values (spacing/container/background/card variants) — never raw CSS.

### 5.4 Catalog

| Model | Purpose / notes |
|---|---|
| `Category` | Self-referencing (`parentId`, `depth`) — see decision note below |
| `Product` | Core product entity; no price field (RFQ model) |
| `Brand` | `name`, `slug`, `logoId`, description, SEO, sections |
| `Specialty` | ICU, OT, Cardiology, etc. |
| `Solution` | ICU Solutions, Hospital Setup, etc. |
| `Application` | Clinical application tags |
| `ProductSpecialty`, `ProductApplication`, `ProductSolution`, `ProductRelated`, `CategorySpecialty`, `SolutionCategory`, `BrandCategory` | Explicit many-to-many joins |
| `ProductSpecGroup` | Per-product specification group (`name`, `order`) |
| `ProductSpecItem` | `groupId`, `label`, `value`, `unit`, `order` |
| `SpecTemplate` / `SpecTemplateGroup` / `SpecTemplateField` | Reusable per-category specification blueprints used to seed a product's groups |
| `ProductDocument` | Brochure / datasheet / catalogue / manual, with `gated` flag |
| `Faq` | Polymorphic FAQ (`entityType`, `entityId`, `question`, `answer`, `order`) |

**Decision — subcategories.** The specification names Category and Subcategory as separate
managed entities. The schema implements a **single `Category` model with a self-relation**
(`parentId` + `depth`), and the admin exposes **separate Categories and Subcategories screens**
over it. Rationale: a subcategory requires exactly the same capabilities as a category (own
slug, SEO, FAQs, CMS sections, products, status, RFQ CTA). Two near-identical tables would
duplicate every query, every form, and every SEO code path, and would block a future third
level. This is a structural simplification and is documented here as required. All
specification-level subcategory requirements are met.

### 5.5 Locations & programmatic SEO

| Model | Purpose |
|---|---|
| `Country` | Root of hierarchy (India at launch) |
| `State` | `countryId`, `name`, `slug` |
| `City` | `stateId`, `name`, `slug`, hero/intro/content, `status`, `indexable`, SEO |
| `CityCategoryPage` | The city × category combination: `cityId`, `categoryId`, `status`, `indexable`, overrides for H1/intro/content/FAQ/sections. **Created only when explicitly enabled — never auto-generated for every combination.** |
| `SeoTemplate` | `scope` (CITY, CITY_CATEGORY, PRODUCT, CATEGORY, BRAND, SPECIALTY), title/description/H1 patterns with `{variables}` |
| `SeoMeta` | Per-entity SEO override (title, description, canonical, robots, OG fields, sitemap inclusion) |
| `Redirect` | `source` (unique), `destination`, `type` (301/302), `enabled` |
| `InternalLinkRule` | Contextual linking configuration with manual override |

### 5.6 RFQ, leads, forms

| Model | Purpose |
|---|---|
| `Rfq` | Submitted quotation request; links to `Lead` |
| `RfqItem` | `rfqId`, `productId`, `quantity`, `notes` |
| `Lead` | Central enquiry record: contact, organization, source, stage, priority, `assignedStaffId`, landing page, referrer |
| `LeadAttribution` | First-touch and last-touch UTM parameters |
| `LeadActivity` | CRM timeline: created, assigned, stage changed, note, contact attempt |
| `LeadAssignment` | Assignment history |
| `FormDefinition` | Reusable form: name, success message, notification recipients |
| `FormField` | `formId`, `type`, `label`, `placeholder`, `helpText`, `required`, `order`, `enabled`, options |
| `FormSubmission` | Raw submission linked to the created `Lead` |

CRM timeline (`LeadActivity`) and security history (`AuditLog`) are deliberately separate, per
specification §42.

### 5.7 Content & trust

`BlogPost`, `BlogCategory`, `BlogTag`, `BlogPostTag`, `Testimonial`, `CaseStudy`,
`Certification`, `ClientLogo`, `DownloadRequest`.

No testimonial, certification, client, or partnership is ever seeded as production content.

### 5.8 Backup

| Model | Purpose |
|---|---|
| `BackupJob` | `type` (MANUAL/SCHEDULED), `status`, `databaseStatus`, `mediaStatus`, `sizeBytes`, `durationMs`, `checksum`, `storagePath`, `createdById`, `error` |
| `RestoreJob` | `backupId`, `status`, `preRestoreBackupId`, `startedAt`, `finishedAt`, `error` |
| `BackupSchedule` | Cron expression + retention policy (daily/weekly/monthly counts) |

### 5.9 Conventions applied to every model

- `id` — cuid primary key.
- `createdAt` / `updatedAt` on all mutable entities.
- `status` enums rather than booleans where a lifecycle exists (`DRAFT`, `REVIEW`,
  `PUBLISHED`, `ARCHIVED`).
- Soft deletion (`deletedAt`) **only** on `Product`, `Category`, `MediaAsset`, and `Lead` —
  entities where accidental deletion is costly and restore is a real requirement. Everything
  else hard-deletes, to avoid the query complexity tax.
- Indexes on: every `slug` (unique within routing context), `status`, `publishedAt`,
  `categoryId`, `brandId`, `cityId`, `stateId`, `assignedStaffId`, `stage`, `createdAt`,
  and every foreign key used in list filters.

---

## 6. Route Architecture

### 6.1 Public routes

| Route | Renders |
|---|---|
| `/` | Homepage — CMS sections, fully reorderable |
| `/products` | Product index with filters and pagination |
| `/products/[slug]` | Premium product detail page |
| `/categories/[category]` | Category landing page |
| `/categories/[category]/[subcategory]` | Subcategory landing page |
| `/brands` · `/brands/[slug]` | Brand index and detail |
| `/specialties` · `/specialties/[slug]` | Specialty index and detail |
| `/solutions` · `/solutions/[slug]` | Solution index and detail |
| `/locations` | Coverage index (states → cities) |
| `/locations/[city]` | City landing page |
| `/locations/[city]/[categoryPageSlug]` | e.g. `/locations/delhi/icu-equipment-supplier` |
| `/blog` · `/blog/[slug]` · `/blog/category/[slug]` | Resource centre |
| `/rfq` | RFQ basket and quotation form |
| `/search` · `/compare` · `/contact` | Utility pages |
| `/[...slug]` | CMS-managed pages (About, Privacy, Terms, …) |

**Routing risk.** The `/[...slug]` catch-all can shadow future static segments. Mitigation:
static segments always win in Next.js route resolution, and Phase 10 adds a reserved-slug
denylist in slug validation so an editor cannot create a page at `products`, `admin`, `api`, etc.

**City × category slug.** The combination page slug is stored on `CityCategoryPage`
(e.g. `medical-equipment-supplier`) and is unique per city, which keeps the URL human-readable
and editable while remaining a single dynamic segment.

### 6.2 Admin routes

`/admin/{dashboard,leads,rfqs,products,categories,subcategories,brands,specialties,solutions,locations,pages,blogs,media,forms,seo,staff,roles,backups,audit-logs,settings,profile}`
— each guarded by `requirePermission(module, action)` in the layout **and** in every action.

### 6.3 API route handlers

`/api/auth/[...nextauth]`, `/api/health`, `/api/media/upload`, `/api/media/file/[...path]`,
`/api/backups/[id]/download`, `/sitemap.xml`, `/sitemaps/[segment].xml`, `/robots.txt`.

---

## 7. CMS Architecture

### 7.1 Section registry

Each section type is one directory exporting a single registry entry:

```ts
type SectionDefinition<TContent> = {
  type: SectionType;
  label: string;
  contentSchema: ZodSchema<TContent>;   // validates content JSON
  designSchema: ZodSchema<SectionDesign>; // enumerated options only
  defaults: { content: TContent; design: SectionDesign };
  Renderer: (props: { content: TContent; design: SectionDesign }) => ReactNode; // RSC
  Editor: ComponentType<EditorProps<TContent>>;  // client
};
```

The page renderer maps `PageSection[]` → registry lookup → `Renderer`. An unknown or
schema-invalid section is skipped and logged rather than crashing the page.

### 7.2 Content vs Design separation

- **CONTENT** — the information: headings, copy, selected products, images, links.
- **DESIGN** — enumerated presentation only:

| Option | Allowed values |
|---|---|
| `spacing` | `compact` · `normal` · `large` · `xl` |
| `container` | `narrow` · `standard` · `wide` · `full` |
| `background` | `default` · `white` · `light` · `dark` · `brand` |
| `align` | `left` · `center` |
| `columns` | `2` · `3` · `4` |
| `cardStyle` | `standard` · `bordered` · `elevated` · `minimal` |
| `imagePosition` | `left` · `right` |

No free-text CSS, class names, or style attributes are accepted from the CMS at any point.
`anchorId` is validated against `^[a-z][a-z0-9-]*$`.

### 7.3 Section types (Phase 10)

Hero, Rich Text, Heading + Text, Image + Text, Text + Image, Image Cards, Icon Cards,
Product Grid, Category Grid, Subcategory Grid, Brand Grid, Specialty Grid, Statistics,
Logo Strip, Testimonials, FAQ, CTA, Form, Table, Comparison Table, Gallery, Video,
Brochure/Download, Related Products, Related Categories, Related Locations, Trust/Certification,
Timeline, Process/Steps, Tabs, Accordion.

Entities that own CMS sections: `Page`, `Category`, `Brand`, `Specialty`, `Solution`, `City`,
`CityCategoryPage`. Implemented via a shared `SectionOwner` pattern (`ownerType` + `ownerId`)
so one editor and one renderer serve all of them.

---

## 8. Auth Architecture

- **Auth.js (NextAuth) v5**, Credentials provider, **JWT session strategy** (required for
  credentials).
- **Password hashing:** bcrypt with cost 12 (`bcryptjs` — pure JS, no native build step in
  Docker). Passwords are never logged, returned, or included in audit metadata.
- **Login response:** identical generic error for unknown email, wrong password, and
  deactivated account — no account enumeration (specification §49).
- **Brute force:** `LoginAttempt` records by email and IP; progressive lockout after a
  configurable threshold within a rolling window.
- **Session claims:** `sub`, `roleKey`, `permissions[]`, `tokenVersion`, `jti`. Permissions are
  resolved at sign-in and re-validated server-side on every privileged action — the JWT is a
  cache, never the authority.
- **Forced logout:** `Staff.tokenVersion` increment invalidates all existing tokens.
- **Cookies:** `httpOnly`, `secure` in production, `sameSite: lax`, `__Host-` prefix.
- **Route protection:** middleware for coarse `/admin/*` gating (cheap redirect) plus
  `requirePermission()` in every layout, Server Action, and Route Handler (the real control).
- **TOTP readiness (Phase 5):** `TwoFactorSecret` and `RecoveryCode` models plus an
  `otplib`-based verification step in the credentials flow. Standards-based TOTP only —
  compatible with Microsoft Authenticator and Google Authenticator. No custom OTP scheme.

---

## 9. RBAC Architecture

### 9.1 Model

`Permission` is `(module, action)`. Modules: Dashboard, Leads, RFQ, Products, Categories,
Brands, Specialties, Solutions, Locations, Pages, Blogs, Media, Forms, SEO, Staff, Roles,
Backups, AuditLogs, Settings. Actions: `VIEW`, `CREATE`, `EDIT`, `DELETE`, `PUBLISH`,
`EXPORT`, `ASSIGN`, `RESTORE`, `MANAGE_SETTINGS`.

A staff member's effective permission set is:
`role.permissions ∪ overrides(GRANT) \ overrides(REVOKE)`, with `SUPER_ADMIN` short-circuiting
to allow-all.

### 9.2 Default roles

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Everything, including backups, restore, roles, settings |
| `ADMIN` | Everything except restore and role editing |
| `SALES_MANAGER` | Leads/RFQ full including assign and export; catalog read |
| `SALES_EXECUTIVE` | Own/assigned leads; no export, no delete |
| `CONTENT_MANAGER` | Pages, blogs, media, catalog content; no publish of SEO-critical location pages |
| `SEO_MANAGER` | SEO, locations, redirects, sitemap, indexation |
| `VIEWER` | Read-only |

### 9.3 Enforcement

```ts
await requirePermission('LEADS', 'EXPORT');   // throws -> 403 page / action error
```

Called in: admin layouts (navigation gating), every Server Action (authoritative), every
Route Handler, and every export/download path. Row-level scoping (sales executives see only
assigned leads) is applied in the repository layer, not the UI.

---

## 10. Media Storage Architecture

- **Root:** `UPLOAD_ROOT`, default `/data/hnmedical/uploads`, a persistent VPS volume mounted
  into the container. Never the ephemeral container filesystem, never S3/R2.
- **Layout:** `products/ categories/ brands/ blogs/ pages/ cities/ brochures/ documents/ general/`,
  each sharded by `YYYY/MM` to keep directory sizes sane.
- **Storage names:** generated (`cuid + extension`) — the original filename is retained only as
  metadata. This neutralizes filename-based attacks and collisions.
- **Path safety:** every resolved path is `path.resolve()`d and asserted to remain within
  `UPLOAD_ROOT` before any read, write, move, or delete. No user-supplied path segment is
  ever concatenated directly.
- **Validation:** extension allowlist **and** magic-byte MIME sniffing (`file-type`), with a
  configurable size limit. Declared `Content-Type` is never trusted.
- **SVG:** sanitized on upload; served with `Content-Security-Policy: sandbox` and
  `X-Content-Type-Options: nosniff`.
- **Serving:** uploads are **not** inside `public/`. They are served through
  `/api/media/file/[...path]` with long-lived immutable cache headers, which keeps deletion,
  authorization, and traversal protection under application control.
- **Execution safety:** the upload volume is mounted `noexec` where the host allows it, and no
  route ever executes an uploaded file.
- **Deletion:** blocked (or explicitly warned, per configuration) when `MediaUsage` rows exist.

---

## 11. RFQ Architecture

- **Basket:** client-side state persisted to `localStorage`, hydrated into a `RFQDrawer`
  Client Component. No server session is required to browse and collect products, which keeps
  the public site fully cacheable.
- **Contents:** `{ productId, quantity, notes }[]`, with update/remove/clear.
- **Submission:** Server Action → Zod validation → rate limit → transaction creating
  `Rfq` + `RfqItem[]` + `Lead` (source `RFQ`) + `LeadAttribution` + initial `LeadActivity`.
- **Product identity is re-read server-side** from the database at submission; client-supplied
  names and prices are ignored entirely.
- **No checkout, no payment, no pricing** — by design.
- Attachment upload reuses the media pipeline with a restricted allowlist and a separate
  quarantine folder.

---

## 12. CRM Architecture

- **Single funnel.** Every enquiry — contact form, RFQ, product enquiry, category enquiry, city
  landing page, gated brochure download, custom form — creates exactly one `Lead` with a
  `source` discriminator. There is no second inbox.
- **Stages:** `NEW → CONTACTED → QUALIFIED → QUOTATION_SENT → NEGOTIATION → WON | LOST`,
  modelled as an enum with a `LeadStageConfig` table planned for later customization.
- **Assignment:** manual assign/reassign writing `LeadAssignment` history; the service layer is
  shaped so a rules engine can be added later without changing call sites.
- **Timeline:** `LeadActivity` records creation, assignment, stage change, note, contact
  attempt, RFQ update, quotation status — the sales-visible history.
- **Audit separation:** security-sensitive actions (export, delete, permission change) also
  write `AuditLog`. The two are never merged.
- **Attribution:** first-touch and last-touch UTM captured from cookies set on landing, stored
  in `LeadAttribution`, surfaced in dashboard breakdowns.

---

## 13. Programmatic SEO Architecture

This is the highest-risk subsystem: done badly it produces doorway pages and a manual action.
The architecture is deliberately conservative.

### 13.1 Generation model

Cities are created manually or by CSV import. City × category pages are **never** generated
automatically for the full cross-product. An administrator explicitly enables a combination,
which creates a `CityCategoryPage` row in `DRAFT` + `NOINDEX`.

### 13.2 Template engine

`SeoTemplate` stores patterns with `{city}`, `{state}`, `{category}`, `{subcategory}`,
`{product}`, `{brand}`, `{specialty}`. Resolution order:

```
per-page override  →  entity-scope template  →  global template
```

Rendering is a pure function over a typed variable bag. **An unresolved placeholder is a hard
validation failure** — such a page can never reach `PUBLISHED + INDEX`.

### 13.3 Thin-content and duplication guards (Phase 32)

Before a page may be published *and* indexable, all checks must pass:

1. No unresolved template variables.
2. Title and H1 unique across published pages (enforced by a uniqueness check, not a hope).
3. Meta description present and within length bounds.
4. Canonical resolved and self-referential unless deliberately overridden.
5. Linked city and category exist and are published.
6. At least N related products/categories with real content (configurable).
7. Body content above a configurable minimum word count, excluding boilerplate.
8. No duplicate city × category combination.

Failures are shown as blocking errors in the admin; warnings are shown but do not block.
Pages remain `DRAFT`/`NOINDEX` until they pass — bulk creation never implies indexation.

### 13.4 Internal linking (Phase 33)

Deterministic, rule-driven contextual links (city → its category pages, product → category,
subcategory, brand, specialty; specialty → products and categories; city → nearby cities),
with manual override and an orphan-page report.

---

## 14. Backup Architecture

- **Root:** `BACKUP_ROOT`, default `/data/hnmedical/backups` — a persistent volume, outside
  the web root, never publicly served.
- **Contents of one backup:** `pg_dump` (custom format) + a tar of `UPLOAD_ROOT` + a manifest
  (`app version, schema migration name, created by, timestamps, checksums`). Database-only is
  explicitly **not** a backup.
- **Integrity:** SHA-256 checksum per artifact recorded in `BackupJob` and verified before any
  restore.
- **Scheduling:** configurable cron with retention (default 7 daily / 4 weekly / 6 monthly).
  Retention pruning runs after each successful backup so the disk cannot silently fill. A
  free-space precheck aborts the job with a clear error rather than filling the volume.
- **Restore:** `RESTORE` permission (Super Admin only by default) → integrity verification →
  explicit typed confirmation → **automatic pre-restore safety backup** → database restore →
  media restore → consistency verification → `AuditLog`. Failure at any step leaves the
  pre-restore backup intact and reports precisely which stage failed.
- **Download:** authorized, non-guessable, streamed through a Route Handler with permission and
  traversal checks. No directory listing, no predictable public URL.
- **Encryption-ready:** the manifest carries an `encryption` field (`none` at launch) so
  at-rest encryption can be added without changing the archive format.

---

## 15. Security Plan

| Threat | Control | Phase |
|---|---|---|
| SQL injection | Prisma parameterized queries; no raw SQL with interpolation | 2 |
| Broken access control | `requirePermission()` server-side on every action/handler; row-level scoping in repositories | 4 |
| Account enumeration | Identical generic auth failure messages | 3 |
| Brute force | `LoginAttempt` throttling by email + IP, progressive lockout | 3 |
| Session theft | `httpOnly`/`secure`/`sameSite` cookies, `__Host-` prefix, `tokenVersion` revocation | 3 |
| CSRF | Auth.js CSRF tokens; Server Actions' origin checks; no state-changing GETs | 3 |
| XSS | React escaping by default; rich text sanitized server-side on save; no `dangerouslySetInnerHTML` on unsanitized input | 10 |
| Unsafe uploads | Magic-byte MIME sniffing, extension allowlist, generated names, size caps, SVG sanitization, `noexec` volume | 7–8 |
| Path traversal | `path.resolve()` containment assertions on every media and backup path | 7, 51 |
| Mass assignment | Zod schemas define exactly which fields each action accepts | all |
| Sensitive data exposure | No secrets in audit logs, error responses, or the healthcheck; generic production error pages | 46, 54 |
| Unsafe redirects | Redirect destinations validated as relative paths or allowlisted hosts; loop detection | 37 |
| Backup exfiltration | Permission-gated streaming download; backups outside web root | 51 |
| Dependency risk | Pinned versions, no unpinned `@latest`, `npm audit` in CI | 52 |

Additional: security headers (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`) set in `next.config.ts`; rate limiting on all public form endpoints.

---

## 16. Deployment Plan

- **Build:** multi-stage Dockerfile — deps → build (`prisma generate` + `next build` with
  `output: 'standalone'`) → minimal runtime. Runs as a **non-root** user.
- **Base image:** Debian slim (not Alpine) — Prisma's engines need glibc/OpenSSL, and Alpine
  is a recurring source of engine-compatibility failures.
- **Migrations:** `prisma migrate deploy` executed as a **deliberate pre-deploy step**, never
  automatically on container start. `prisma migrate reset` is never run against production.
- **Persistent volumes (Coolify):**

| Host path | Container path | Purpose |
|---|---|---|
| `/data/hnmedical/uploads` | `/data/hnmedical/uploads` | Media — must survive redeploys |
| `/data/hnmedical/backups` | `/data/hnmedical/backups` | Backup archives |

- **Environment variables:** `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`/`NEXTAUTH_URL`,
  `APP_URL`, `UPLOAD_ROOT`, `BACKUP_ROOT`, plus optional analytics IDs. Documented in
  `.env.example` (requires the `.gitignore` fix noted in §1.4).
- **Healthcheck:** `/api/health` returns liveness plus a shallow database probe. It never
  exposes credentials, environment values, or infrastructure names.
- **Database:** PostgreSQL managed by Coolify or an external managed instance; connection
  pooling sized for the container count.

---

## 17. Risk Assessment

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **`prisma@latest` resolves to `8.0.0-rc.15`** (a release candidate) and its dependency graph crashes npm 10.9.7 with `Cannot read properties of null (reading 'edgesOut')`. Verified during this audit. | High — blocks Phase 2 | Pin `prisma@^7.10.0` and `@prisma/client@^7.10.0` (both verified to resolve cleanly; `@6` also verified). Never install Prisma unpinned. |
| R2 | Programmatic location pages degrade into doorway pages → manual action | High | Phase 32 quality gates; explicit opt-in per combination; default `DRAFT`+`NOINDEX` |
| R3 | Restore leaves the system half-restored | High | Integrity verification, mandatory pre-restore safety backup, staged restore with per-stage reporting |
| R4 | Media loss on redeploy | High | Persistent volume from Phase 7; never write to container FS; verified in Phase 61 |
| R5 | Backups fill the VPS disk | Medium | Retention pruning after each job + free-space precheck |
| R6 | CMS flexibility destroys the design system | Medium | Enumerated design tokens only; no arbitrary CSS; validated by Zod |
| R7 | Tailwind v4 has no JS config — v3 patterns will not apply | Medium | Tokens defined via `@theme` in `tokens.css` from Phase 1 |
| R8 | Auth.js v5 credentials cannot use database sessions | Medium | JWT strategy + `tokenVersion` revocation + `StaffSession` tracking (§8) |
| R9 | N+1 queries on catalog and location pages | Medium | Repository layer with explicit `select`/`include`; pagination everywhere; indexes per §5.9 |
| R10 | SVG upload XSS | Medium | Sanitization on upload, sandboxed CSP on serve |
| R11 | Scope is very large; partial delivery risks a broken build | Medium | Strict phase boundaries; lint + typecheck + build green at the end of every phase |
| R12 | Prisma engines on Alpine | Low | Debian-slim base image |
| R13 | CMS catch-all route shadowing | Low | Reserved-slug denylist in slug validation |

---

## 18. Phase Dependencies

```
0  Audit ─────────────────────────────────────────── (this document)
1  Design System ──────┐
2  Database ───────────┼──► 3 Auth ──► 4 RBAC ──► 5 Profile
                       │                   │
                       └──► 6 Admin UI ◄───┘
                                │
                                ├──► 7 Storage ──► 8 Media ──┐
                                │                            │
                                ├──► 9 Settings ─────────────┼──► 10 CMS ──► 11 Nav
                                │                            │
                                └──► 12–16 Catalog ◄─────────┘
                                          │
                                          ├──► 17 Products ──► 18 Specifications
                                          │            │
                                          │            └──► 19–21 Premium Frontend
                                          │                          │
                                          ├──► 22–23 RFQ ◄───────────┘
                                          │        │
                                          │        └──► 24 Forms ──► 25–26 CRM
                                          │
                                          └──► 27 Locations ──► 28 City Pages
                                                       │
                                                       ├──► 29 City × Category
                                                       ├──► 30 Bulk Import
                                                       └──► 31 Templates ──► 32 Quality Gates
                                                                                   │
                                                                 33 Internal Linking
                                                                                   │
                                                            34–37 SEO Infrastructure
                                                                                   │
                                            38–42 Content ── 43–45 Analytics ── 46 Audit
                                                                                   │
                                                              47–51 Backup & Restore
                                                                                   │
                                                                 52–54 Docker/Coolify
                                                                                   │
                                                                     55–59 Hardening
                                                                                   │
                                                                   60–62 Validation
                                                                                   │
                                                                    63 Documentation
```

**Hard prerequisites**

- Phase 2 (Database) blocks every data-backed phase.
- Phase 4 (RBAC) blocks every admin write path — no admin CRUD should ship before it.
- Phase 7 (Storage) blocks Phase 8 (Media), which blocks image-bearing CMS and catalog phases.
- Phase 10 (CMS) blocks Phases 11, 19, 21, 28 — all premium pages render through the section system.
- Phase 27 (Locations) blocks Phases 28–33.
- Phase 47 (Backup foundation) blocks Phases 48–51 and 61.
- Phase 61 (real restore test) is the gate for declaring backup complete.

---

## 19. Acceptance Criteria (Phase 0)

- [x] Repository inspected: stack, versions, configuration, structure, git state.
- [x] Critical blocker identified and a verified remedy documented (R1).
- [x] `IMPLEMENTATION-PLAN.md` created containing every required section.
- [x] No major refactors performed in this phase.
- [x] Build remains green (`npm run build` succeeds).
