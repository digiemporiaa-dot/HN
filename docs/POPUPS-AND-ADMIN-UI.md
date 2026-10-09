# Popups and the admin interface

## Popups

Admin → Content → **Popups** (`/admin/popups`). One dialog at a time, shown to
visitors of the public site. Each popup has one of four types:

| Type | Shows |
| --- | --- |
| Enquiry form | A **published** form. Its submissions use the normal form pipeline: rate limits, honeypot, file checks, lead mapping and the notification email. |
| Product spotlight | A **published** product, with its image, linking to the product page. |
| Resource | A brochure, guide or page, behind a button. |
| Announcement | A short notice with an optional button. |

### When a popup shows

A visitor sees a popup only if all of the following are true:

1. It is **active**. New and duplicated popups start inactive. Switching a
   popup on needs the `POPUPS:PUBLISH` permission and is audited.
2. It is not deleted.
3. The time is inside its schedule. The start is inclusive and the end
   exclusive. Times are India Standard Time.
4. What it depends on is still published. A popup whose form or product has
   been unpublished is left out, not shown half-empty.
5. The page matches its rules (see below).
6. The device matches. Exit intent never fires on phones.
7. The visitor has not closed it recently. "Show again after N days" counts
   from when it was closed or its form was completed. **0** means the next
   visit (a new browser session), never twice in one.
8. No other dialog is open and the visitor is not typing in a form.

There is at most one popup per visit. A visit is one page load, however many
pages are browsed after it. When several popups qualify, the one with the
highest **priority** wins; ties go to the oldest id. Moving to another page
while a popup is open closes it.

### Page rules

Rules are site paths, one per line. They are stored normalised: lower case,
no trailing slash, no query string.

| Rule | Matches |
| --- | --- |
| `/contact` | that page only |
| `/products/*` | `/products` and every page under it |
| `/*` | every page |

- **All pages, except…** shows the popup everywhere except pages that match a rule.
- **Only these pages** shows it only on pages that match a rule, and needs at least one rule.
- A `*` can only end a rule. Full addresses (`https://…`) are refused.

Some pages are never covered, whatever the rules say: `/admin`, the sign-in
and password pages, `/api`, `/rfq` and `/contact`.

The rules live in `src/lib/popups/rules.ts`. The editor, the server and the
browser all use that same code, and `tests/popup-rules.test.ts` covers it.

### What the browser receives

The public site fetches `GET /api/public/popups` at runtime. The response is
not part of the cached pages, so switching a popup on or off takes effect
within about 15 seconds without a rebuild. The response contains:

- the popup's content and display rules;
- only the form fields a visitor fills in.

It never contains the internal name, the form's notification address or its
lead mapping. CMS form sections strip the same fields
(`clientForm()` in `src/server/forms/service.ts`).

A submission is credited to a popup only when the server confirms three things:

- the popup is live;
- it is an enquiry popup;
- it holds that exact form.

The credit is recorded in the lead's activity ("Submitted through Enquiry
(popup: …)") and in the `FORM_SUBMITTED` audit entry. A made-up popup id is
ignored.

### Permissions

| Role | Popups |
| --- | --- |
| Super Admin, Admin, Content Manager | view, create, edit, delete, publish (activate) |
| SEO Manager, Viewer | view |
| Sales Manager, Sales Executive | none |

Popups are the `content.popups` resource (see `docs/PERMISSIONS.md`). Every page and server action checks its own permission. Hiding a menu item
only declutters the screen; it does not grant or deny access. Migration
`…_popup_permissions` adds the rows and grants to existing databases, and
individual overrides on a staff member apply to `POPUPS` like any other module.

### Demo popup

`node ops/seed-demo.mjs` adds one popup, **inactive**. `--remove` deletes it
by id. Popups that staff created are never touched.

## Admin interface

- **Theme.** Light, Dark or System:
  - Switch it with the Sun/Moon switch in the top bar. **System** is in the account menu.
  - The choice is stored in `localStorage` (`hn:admin:theme`) and synced across tabs.
  - A nonce-carrying inline script in the admin layout applies it before the first paint, so the page never flashes the wrong theme.
- **Styles.** `src/app/(admin)/admin/admin-ui.css`:
  - Every rule is scoped to `.admin-ui`, and a test enforces this.
  - It re-points the site's own semantic tokens (`--color-surface`, `--color-ink`, …) rather than adding a second token system.
  - The public site never loads it.
  - Glass is used only on the rail, the top bar, menus, the search panel and the metric tiles. It falls back to solid when there is no `backdrop-filter`, and under `prefers-reduced-transparency`.
- **Shell.** The sidebar is a floating rail, 256 px wide or 76 px collapsed; the collapsed state is remembered. On a phone it becomes a drawer. The top bar holds:
  - breadcrumbs;
  - search;
  - a permission-filtered **Create** menu;
  - the theme switch;
  - **View website**;
  - the account menu.
- **Search** (Ctrl K / ⌘K):
  - Destinations and create actions come from the filtered menu.
  - Records come from `adminSearch` (`src/server/admin-search.ts`), which checks each category's permission on the server.
- **Unsaved changes.**
  - Edits inside editing forms are tracked.
  - Filter and search forms are ignored.
  - Leaving by an in-app link asks first; closing the tab triggers the browser's own warning.
- **Controls** (`src/components/ui`):
  - `Switch` and `usePersistedToggle`: optimistic, with rollback to the stored value on refusal.
  - `SegmentedControl`: radio or tabs, pill or underline.
  - `Menu`, `Popover` (a bottom sheet on phones), `Calendar`.
  - `DateField`, `DateTimeField` and `DateRangeCalendar`: DD/MM/YYYY, wall-clock time in India, never shifted by the browser's time zone (`src/lib/dates/ist.ts`).
