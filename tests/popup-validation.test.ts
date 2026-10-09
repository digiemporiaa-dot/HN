import { describe, expect, it } from "vitest";

import { isSafeHref, popupSchema, popupFiltersSchema } from "@/lib/validation/popups";

const valid = {
  name: "ICU enquiry",
  type: "ANNOUNCEMENT",
  eyebrow: "",
  heading: "Planning an ICU upgrade?",
  description: "",
  imageId: "",
  productId: "",
  formId: "",
  ctaLabel: "Discuss your requirement",
  ctaHref: "/contact",
  trigger: "DELAY",
  delaySeconds: "8",
  scrollPercent: "50",
  device: "ALL",
  frequencyDays: "7",
  priority: "0",
  startsAt: "",
  endsAt: "",
  targetMode: "EXCLUDE",
  targetRules: "",
};

const errorsOf = (input: Record<string, unknown>) => {
  const result = popupSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
};

describe("popup validation", () => {
  it("accepts a complete announcement and coerces numbers", () => {
    const result = popupSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.delaySeconds).toBe(8);
      expect(result.data.targetRules).toEqual([]);
      expect(result.data.startsAt).toBeNull();
    }
  });

  it("has no active field: activation is never read from the editor", () => {
    const result = popupSchema.safeParse({ ...valid, active: "true" });
    expect(result.success && "active" in result.data).toBe(false);
  });

  it("refuses unsafe link schemes", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,x", "http://example.com", "//evil.test", "vbscript:x"]) {
      expect(isSafeHref(href)).toBe(false);
      expect(errorsOf({ ...valid, ctaHref: href }).ctaHref).toBeDefined();
    }
    for (const href of ["/contact", "https://example.com/brochure.pdf", "mailto:sales@example.com", "tel:+91 11 4000 0000"]) {
      expect(isSafeHref(href)).toBe(true);
    }
  });

  it("refuses unknown triggers, devices and types", () => {
    expect(errorsOf({ ...valid, trigger: "ON_LOAD" }).trigger).toBeDefined();
    expect(errorsOf({ ...valid, device: "TABLET" }).device).toBeDefined();
    expect(errorsOf({ ...valid, type: "DISCOUNT" }).type).toBeDefined();
  });

  it("bounds the numbers", () => {
    expect(errorsOf({ ...valid, delaySeconds: "-1" }).delaySeconds).toBeDefined();
    expect(errorsOf({ ...valid, delaySeconds: "601" }).delaySeconds).toBeDefined();
    expect(errorsOf({ ...valid, scrollPercent: "2" }).scrollPercent).toBeDefined();
    expect(errorsOf({ ...valid, frequencyDays: "1.5" }).frequencyDays).toBeDefined();
  });

  it("requires the end to be after the start", () => {
    expect(errorsOf({ ...valid, startsAt: "2026-10-10T09:00", endsAt: "2026-10-10T09:00" }).endsAt).toBeDefined();
    expect(errorsOf({ ...valid, startsAt: "2026-10-10T09:00", endsAt: "2026-10-09T09:00" }).endsAt).toBeDefined();
    expect(errorsOf({ ...valid, startsAt: "2026-10-10T09:00", endsAt: "2026-10-10T09:01" })).toEqual({});
    expect(errorsOf({ ...valid, startsAt: "10/10/2026" }).startsAt).toBeDefined();
  });

  it("validates and normalises page rules", () => {
    expect(errorsOf({ ...valid, targetMode: "INCLUDE", targetRules: "" }).targetRules).toBeDefined();
    expect(errorsOf({ ...valid, targetRules: "https://x.test/a" }).targetRules).toBeDefined();
    const result = popupSchema.safeParse({ ...valid, targetMode: "INCLUDE", targetRules: "/Products/*\n/blog/" });
    expect(result.success && result.data.targetRules).toEqual(["/products/*", "/blog"]);
  });

  it("requires what each type depends on", () => {
    expect(errorsOf({ ...valid, type: "ENQUIRY" }).formId).toBeDefined();
    expect(errorsOf({ ...valid, type: "PRODUCT_SPOTLIGHT" }).productId).toBeDefined();
    expect(errorsOf({ ...valid, type: "RESOURCE", ctaHref: "", ctaLabel: "" }).ctaHref).toBeDefined();
    expect(errorsOf({ ...valid, ctaLabel: "" }).ctaLabel).toBeDefined();
  });

  it("drops links a type does not use", () => {
    const result = popupSchema.safeParse({ ...valid, formId: "form1", productId: "prod1" });
    expect(result.success && [result.data.formId, result.data.productId]).toEqual(["", ""]);
  });

  it("falls back to safe list filters", () => {
    expect(popupFiltersSchema.parse({ q: "x", state: "nonsense", type: "" })).toEqual({ q: "x", state: "all", type: "all" });
  });
});
