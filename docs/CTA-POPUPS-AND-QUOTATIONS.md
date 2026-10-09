# CTA popups, gated downloads and quotations

## In one paragraph

Every configurable button on the public site describes itself and then hands control to one shared controller, which opens one shared dialog.

- A button declares a **kind** (Download brochure, Request quotation, and so on) and a stable **placement** id. It also passes what it sits beside, such as a product or a document.
- The controller (`src/components/site/cta/cta-provider.tsx`) resolves the live **configuration** for that button. It then either opens the shared dialog or acts straight away. The dialog is always a centered modal, built on the native `<dialog>` in `src/components/ui/modal.tsx`.
- With no configuration, a button keeps its built-in behaviour. Nothing on the site changed until an administrator configured something.

## Pieces

| What | Where |
| --- | --- |
| Kinds, popup types, labels | `src/lib/cta/kinds.ts` |
| Button placements (stable ids) | `src/lib/cta/placements.ts` |
| Resolution rules (pure) | `src/lib/cta/resolve.ts` |
| Built-in behaviour and merging | `src/lib/cta/effective.ts` |
| Configurable fields and validation | `src/lib/cta/fields.ts` |
| Editor validation | `src/lib/validation/cta.ts` |
| Public configuration feed | `GET /api/public/cta` (public shape only, 15 s cache) |
| Lead capture / gated download submit | `submitCtaLeadAction` in `src/server/cta/actions.ts` |
| Quotation submit and product search | `src/server/quotes/actions.ts` |
| Quotation admin actions | `src/server/quotes/admin-actions.ts` |
| CTA configuration admin actions | `src/server/cta/admin-actions.ts` |
| Admin screens | `/admin/cta-popups`, `/admin/rfqs` (menu: Content › CTA popups, Sales › Quotations) |

## Which configuration applies

Only **active** configurations of the button's own kind take part.

Levels, most specific first:

1. a configuration a page-builder button chose explicitly;
2. one listing the button's placement;
3. the default for the kind.

Within a level:

- one restricted to the product beats one restricted to pages, which beats an unrestricted one;
- a configuration whose product or page restriction does not match is not a candidate at all.

Nothing else is ever matched, labels least of all. The browser resolves this to decide what to show. The **server resolves it again on every submission**, from the database, and its answer decides which fields are required and what is released.

### Placements

| Id | Button |
| --- | --- |
| `product.hero.quote`, `product.sticky.quote`, `product.closing.quote` | Product page quotation buttons |
| `product.hero.brochure`, `product.documents.download` | Product page brochure / documents |
| `header.quote-list` | Header quotation list |
| `rfq.page` | The `/rfq` page |
| `cms.brochure.download` | Page builder, Brochure download section |
| `cms.cta.primary`, `cms.cta.secondary` | Page builder, Call to action section |

An id is never renamed or reused. A retired one is removed and simply stops matching.

## Gated downloads

1. A document marked **gated** on the product always asks first. This holds even when a configuration says "direct": its address is never sent to the browser, the media route refuses it, and it is reachable only through a grant.
2. On submit, the server does the following in order:
   - resolves the configuration and validates the fields against it;
   - checks that the document belongs to the product the button is on (a catalogue's file comes from the configuration; the request cannot name one);
   - runs the honeypot, timing and rate checks;
   - stores the lead **and** its download grant in one insert.
3. Only then is a `/api/documents/<token>` address returned and the download started.
4. A failure at any step stores nothing and releases nothing.
5. An ungated document with no configuration is still a plain link and downloads directly.
6. A catalogue file named by a live gated configuration is refused by the public media route, like a gated product document.

## Request quotation

- **Centered modal, no drawer, no navigation.** It has three steps (Products → Your details → Review & send) and a success state.
  - Escape and the close button work, and focus returns to the button.
  - The page behind does not scroll.
- **Products step:**
  - the current product is added, and adding it again says it is already on the list (one line per product);
  - search covers published products only;
  - each line has a quantity, notes and remove.
- **Draft:**
  - the list (product ids, quantities, notes) lives in `localStorage` (`hn.quote-basket.v1`), so it survives navigation and reloads;
  - typed contact details live only in memory, so closing and reopening keeps them, and nothing personal is written to storage;
  - everything is cleared once sent.
- **Variants:** products have no variants in this catalogue, so none are offered. Configuration goes in each line's notes. The model number is stored with every line.
- **Storage:**
  - the record is a lead with source `RFQ`, plus line items (`RfqItem`) and a one-to-one `QuoteRequest` row (status, delivery location, expected date), all in one insert;
  - names and model numbers come from the catalogue;
  - prices, owners and statuses in the request are ignored.
- **Idempotency:** a random `submissionKey` per form makes a double click or a retry return the first reference. It is a unique column on `Lead`.
- **Customer form:** fields are configurable under the Request quotation CTA popup. Name, email and consent are always required.

## Statuses and administration

Quotation statuses are New, Under review, Quoted, Won, Lost and Closed.

- Quoted, Won and Lost also move the lead's stage (Quotation sent, Won, Lost).
- Nothing turns a quotation into an order.

The admin list searches reference, name, email, phone, company and product. It filters by status, owner, product and received date, with server-side pagination. The export carries the same filters and no internal notes or IP addresses.

| Action | Permission |
| --- | --- |
| View list/detail | RFQ View |
| Change status, add internal note | RFQ Edit |
| Assign owner (active staff only) | RFQ Assign |
| Export CSV | RFQ Export |
| CTA popups: view / create / edit / delete | CTA_POPUPS View / Create / Edit / Delete |
| Switch a CTA popup on or off | CTA_POPUPS Publish |

Every change is audited: `QUOTE_STATUS_CHANGED`, `QUOTE_ASSIGNED`, `QUOTE_NOTE_ADDED`, and `CTA_CONFIG_*`.

## Notifications

Each new lead or quotation sends:

- the team notification;
- a confirmation to the customer with the reference.

Both are sent after the record is committed, through `sendMail`, which records every attempt and never throws. A mail failure never removes or changes the record. SMTP settings stay on the server.

## Page builder

The Call to action section has the following per button:

- an **action** (link or any CTA kind);
- a **popup configuration** (blank means the default for that action);
- a **behaviour** (as configured, popup first, or direct).

The section also takes an optional **product** for the buttons to act on. The link stays as the fallback. The Brochure download section now lists gated documents too; they open the download form.

## Migrations

- `20261009140000_cta_popups_and_quotations`, schema. Additive:
  - new enums;
  - `CtaConfig` and `QuoteRequest` tables;
  - nullable `Lead.country`, `ctaKey`, `ctaPlacement`, `submissionKey` (unique);
  - `DocumentGrant.mediaId`, with `documentId` relaxed to nullable and a check constraint that exactly one is set;
  - `DocumentKind.CATALOGUE`.
- `20261009140001_cta_popups_and_quotations_backfill`, data. Additive and idempotent:
  - permissions (see `docs/PERMISSIONS.md`);
  - a `QuoteRequest` for every existing RFQ lead, its status read from the lead stage.

Both were applied to a scratch database with old-style roles and overrides. Nobody gained or lost access, a re-run changed nothing, and no existing row was removed.
