import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveCta, type ResolvableConfig } from "@/lib/cta/resolve";
import { builtInCta, effectiveCta, opensPopup, type PublicCtaConfig } from "@/lib/cta/effective";
import { defaultFieldSettings, parseFieldSettings, readFieldSettings, submissionSchema } from "@/lib/cta/fields";
import { CTA_PLACEMENTS } from "@/lib/cta/placements";
import { mergeLines } from "@/lib/validation/rfq";
import { ctaConfigSchema } from "@/lib/validation/cta";
import { leadStageFor } from "@/lib/quotes/status";
import { SYSTEM_ROLES } from "@/server/permissions/catalogue";

const config = (overrides: Partial<PublicCtaConfig>): PublicCtaConfig => ({
  key: "c",
  kind: "DOWNLOAD_BROCHURE",
  isDefault: false,
  placements: [],
  targetProductId: null,
  targetPaths: [],
  updatedAt: "2026-10-01T00:00:00.000Z",
  mode: "POPUP",
  popupType: "GATED_DOWNLOAD",
  heading: "Heading",
  description: null,
  submitLabel: null,
  successMessage: null,
  fields: [],
  consentText: null,
  privacyHref: null,
  afterSubmit: "DOWNLOAD",
  redirectHref: null,
  directHref: null,
  hasFile: false,
  fileHref: null,
  formKey: null,
  ...overrides,
});

describe("which configuration a button uses", () => {
  const configs: ResolvableConfig[] = [
    config({ key: "default", isDefault: true }),
    config({ key: "placed", placements: ["product.hero.brochure"] }),
    config({ key: "placed-product", placements: ["product.hero.brochure"], targetProductId: "p1" }),
    config({ key: "picked", kind: "DOWNLOAD_BROCHURE" }),
    config({ key: "other-kind", kind: "CONTACT_US", isDefault: true }),
    config({ key: "paths-only", isDefault: true, targetPaths: ["/blog/*"] }),
  ];

  it("prefers an explicit choice, then a placement, then the default", () => {
    expect(resolveCta(configs, { kind: "DOWNLOAD_BROCHURE", configKey: "picked", placement: "product.hero.brochure", path: "/" })?.key).toBe("picked");
    expect(resolveCta(configs, { kind: "DOWNLOAD_BROCHURE", placement: "product.hero.brochure", path: "/" })?.key).toBe("placed");
    expect(resolveCta(configs, { kind: "DOWNLOAD_BROCHURE", path: "/" })?.key).toBe("default");
  });

  it("lets a product-specific configuration beat a general one at the same level", () => {
    expect(
      resolveCta(configs, { kind: "DOWNLOAD_BROCHURE", placement: "product.hero.brochure", productId: "p1", path: "/" })?.key,
    ).toBe("placed-product");
  });

  it("never applies a configuration of another kind, or one targeted elsewhere", () => {
    expect(resolveCta(configs, { kind: "REQUEST_QUOTATION", path: "/" })).toBeNull();
    expect(resolveCta(configs, { kind: "DOWNLOAD_BROCHURE", configKey: "other-kind", path: "/" })?.key).toBe("default");
    expect(resolveCta(configs, { kind: "DOWNLOAD_BROCHURE", path: "/blog/post" })?.key).toBe("paths-only");
  });

  it("matches on identifiers, never on labels", () => {
    const ids = CTA_PLACEMENTS.map((placement) => placement.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(\.[a-z-]+)+$/);
  });
});

describe("built-in behaviour keeps existing buttons working", () => {
  it("downloads an ungated document directly, and always asks first for a gated one", () => {
    const brochure = builtInCta("DOWNLOAD_BROCHURE");
    expect(opensPopup(brochure)).toBe(false);
    expect(opensPopup(brochure, { gatedDocument: true })).toBe(true);
    // Even a configuration saying "direct" cannot skip a gated document's form.
    expect(opensPopup(effectiveCta("DOWNLOAD_BROCHURE", config({ mode: "DIRECT" })), { gatedDocument: true })).toBe(true);
  });

  it("opens the quotation modal for Request quotation", () => {
    const quote = builtInCta("REQUEST_QUOTATION");
    expect(quote.popupType).toBe("REQUEST_QUOTATION");
    expect(opensPopup(quote)).toBe(true);
  });

  it("falls back to built-in copy where a configuration leaves it blank", () => {
    const cta = effectiveCta("DOWNLOAD_BROCHURE", config({ heading: "Get the PDF", submitLabel: null }));
    expect(cta.heading).toBe("Get the PDF");
    expect(cta.submitLabel).toBe(builtInCta("DOWNLOAD_BROCHURE").submitLabel);
  });
});

describe("popup fields", () => {
  const gated = defaultFieldSettings("GATED_DOWNLOAD");

  it("requires name, email and consent always, and configured fields when required", () => {
    const settings = readFieldSettings([{ key: "phone", enabled: true, required: true }], "GATED_DOWNLOAD");
    const result = submissionSchema(settings).safeParse({ name: "A", email: "nope", consent: false, phone: "" });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["name", "email", "consent", "phone"]));
  });

  it("discards a field the configuration hides, whatever was posted", () => {
    const settings = readFieldSettings([{ key: "message", enabled: false, required: true }], "LEAD_CAPTURE");
    const result = submissionSchema(settings).safeParse({ name: "Asha Rao", email: "a@hospital.in", consent: true, message: "x".repeat(9000) });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe("");
    expect(gated.find((field) => field.key === "message")?.enabled).toBe(false);
  });

  it("refuses a delivery date in the past", () => {
    const settings = defaultFieldSettings("REQUEST_QUOTATION");
    const now = new Date("2026-10-09T06:00:00Z");
    const ok = { name: "Asha Rao", email: "a@hospital.in", consent: true };
    expect(submissionSchema(settings, now).safeParse({ ...ok, expectedDate: "2026-10-01" }).success).toBe(false);
    expect(submissionSchema(settings, now).safeParse({ ...ok, expectedDate: "2026-02-30" }).success).toBe(false);
    expect(submissionSchema(settings, now).safeParse({ ...ok, expectedDate: "2026-11-15" }).success).toBe(true);
  });

  it("refuses unknown or misplaced field settings when saving", () => {
    expect(parseFieldSettings([{ key: "salary", enabled: true, required: true }], "LEAD_CAPTURE").ok).toBe(false);
    expect(parseFieldSettings([{ key: "expectedDate", enabled: true, required: true }], "LEAD_CAPTURE").ok).toBe(false);
    expect(parseFieldSettings("nonsense", "LEAD_CAPTURE").ok).toBe(false);
    expect(parseFieldSettings([{ key: "phone", enabled: false, required: true }], "LEAD_CAPTURE")).toMatchObject({
      ok: true,
      settings: expect.arrayContaining([{ key: "phone", enabled: false, required: false }]),
    });
  });
});

describe("quotation lines", () => {
  it("combines duplicates consistently", () => {
    expect(
      mergeLines([
        { productId: "a", quantity: 2, notes: "ICU" },
        { productId: "b", quantity: 1, notes: "" },
        { productId: "a", quantity: 998, notes: "spare" },
      ]),
    ).toEqual([
      { productId: "a", quantity: 999, notes: "ICU; spare" },
      { productId: "b", quantity: 1, notes: "" },
    ]);
  });

  it("moves the lead stage only for Quoted, Won and Lost", () => {
    expect(leadStageFor("QUOTED")).toBe("QUOTATION_SENT");
    expect(leadStageFor("WON")).toBe("WON");
    expect(leadStageFor("LOST")).toBe("LOST");
    expect(leadStageFor("UNDER_REVIEW")).toBeNull();
    expect(leadStageFor("CLOSED")).toBeNull();
  });
});

describe("saving a CTA configuration", () => {
  const valid = {
    key: "brochure-gated",
    name: "Gated brochures",
    kind: "DOWNLOAD_BROCHURE",
    isDefault: false,
    mode: "POPUP",
    popupType: "GATED_DOWNLOAD",
    heading: "Download the brochure",
    afterSubmit: "DOWNLOAD",
    placements: ["product.hero.brochure"],
    fields: [{ key: "phone", enabled: true, required: true }],
  };

  it("accepts a valid configuration", () => {
    expect(ctaConfigSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["an unknown placement", { placements: ["nowhere.button"] }],
    ["a placement of another kind", { placements: ["product.hero.quote"] }],
    ["a popup type the kind does not offer", { popupType: "REQUEST_QUOTATION" }],
    ["a redirect with no address", { afterSubmit: "REDIRECT" }],
    ["a script link", { privacyHref: "javascript:alert(1)" }],
    ["a protocol-relative link", { directHref: "//evil.example/x" }],
    ["a malformed key", { key: "Bad Key!" }],
    ["a restricted default", { isDefault: true }],
    ["an unknown field", { fields: [{ key: "salary", enabled: true, required: false }] }],
    ["a catalogue without a file", { kind: "DOWNLOAD_CATALOGUE", placements: [] }],
  ])("refuses %s", (_label, change) => {
    expect(ctaConfigSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});

describe("permission defaults match the migration", () => {
  it("grants CTA popups exactly where popups are granted, and RFQ Assign with Leads Assign and RFQ Edit", () => {
    for (const role of SYSTEM_ROLES) {
      if (role.permissions === "ALL") continue;
      const held = new Set(role.permissions);
      for (const action of ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"]) {
        expect(held.has(`CTA_POPUPS:${action}`), `${role.key} ${action}`).toBe(held.has(`POPUPS:${action}`));
      }
      expect(held.has("RFQ:ASSIGN"), role.key).toBe(held.has("LEADS:ASSIGN") && held.has("RFQ:EDIT"));
    }
  });

  it("ships the backfill as additive SQL only", () => {
    const sql = readFileSync(join(__dirname, "../prisma/migrations/20261009140001_cta_popups_and_quotations_backfill/migration.sql"), "utf8");
    const schema = readFileSync(join(__dirname, "../prisma/migrations/20261009140000_cta_popups_and_quotations/migration.sql"), "utf8");
    for (const text of [sql, schema]) {
      const code = text.replace(/--.*$/gm, "");
      expect(code).not.toMatch(/^\s*(DELETE|UPDATE|TRUNCATE)\b|\bDROP\s+(TABLE|COLUMN|TYPE|INDEX)\b/im);
    }
  });
});

describe("the quotation flow is a centered modal", () => {
  const read = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

  it("uses the modal dialog, never a drawer", () => {
    for (const path of [
      "src/components/site/cta/cta-provider.tsx",
      "src/components/site/cta/quote-request.tsx",
      "src/components/site/cta/cta-button.tsx",
    ]) {
      expect(read(path), path).not.toMatch(/Drawer|side-?sheet/i);
    }
    expect(read("src/components/site/cta/cta-provider.tsx")).toMatch(/<Modal[\s\S]*size=\{active\.type === "quote" \? "xl"/);
    expect(read("src/components/ui/modal.tsx")).toContain("m-auto");
  });

  it("opens from the product page without navigating", () => {
    const page = read("src/app/(site)/products/[slug]/page.tsx");
    expect(page).not.toContain("EnquiryDialog");
    expect(page).toContain('kind: "REQUEST_QUOTATION"');
  });
});
