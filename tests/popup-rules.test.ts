import { describe, expect, it } from "vitest";

import {
  choosePopup,
  frequencyAllows,
  isAlwaysExcluded,
  matchesDevice,
  matchesRule,
  matchesTargeting,
  normalizePath,
  normalizeRule,
  parseRules,
  popupState,
  storedRules,
  targetingSummary,
  triggerSupported,
  type CandidatePopup,
  type VisitContext,
} from "@/lib/popups/rules";

const DAY = 24 * 60 * 60 * 1000;

describe("path and rule normalisation", () => {
  it("normalises paths", () => {
    expect(normalizePath("/Products/")).toBe("/products");
    expect(normalizePath("products//ventilators?x=1#top")).toBe("/products/ventilators");
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/")).toBe("/");
  });

  it("accepts exact and trailing-wildcard rules", () => {
    expect(normalizeRule("/Contact/")).toEqual({ ok: true, rule: "/contact" });
    expect(normalizeRule("/products/*")).toEqual({ ok: true, rule: "/products/*" });
    expect(normalizeRule("*")).toEqual({ ok: true, rule: "/*" });
    expect(normalizeRule("/*")).toEqual({ ok: true, rule: "/*" });
    expect(normalizeRule("blog/*")).toEqual({ ok: true, rule: "/blog/*" });
  });

  it("refuses full addresses, inner wildcards, queries and unsafe characters", () => {
    expect(normalizeRule("https://example.com/x").ok).toBe(false);
    expect(normalizeRule("//evil.test/x").ok).toBe(false);
    expect(normalizeRule("javascript:alert(1)").ok).toBe(false);
    expect(normalizeRule("/products/*/specs").ok).toBe(false);
    expect(normalizeRule("/a?b=1").ok).toBe(false);
    expect(normalizeRule('/a"onmouseover').ok).toBe(false);
    expect(normalizeRule("/" + "a".repeat(250)).ok).toBe(false);
  });

  it("parses a rule list, reporting errors and dropping duplicates", () => {
    const result = parseRules("/products/*\n/products/*, /blog\nhttps://x.test");
    expect(result.rules).toEqual(["/products/*", "/blog"]);
    expect(result.errors).toHaveLength(1);
  });

  it("reads stored rules defensively", () => {
    expect(storedRules(["/a", 4, "https://x.test", "/b/*"])).toEqual(["/a", "/b/*"]);
    expect(storedRules("nope")).toEqual([]);
  });
});

describe("page targeting", () => {
  it("matches exact rules exactly", () => {
    expect(matchesRule("/contact", "/contact")).toBe(true);
    expect(matchesRule("/contact/", "/contact")).toBe(true);
    expect(matchesRule("/contact-us", "/contact")).toBe(false);
    expect(matchesRule("/contact/form", "/contact")).toBe(false);
  });

  it("matches wildcard rules as a prefix, including the base path", () => {
    expect(matchesRule("/products", "/products/*")).toBe(true);
    expect(matchesRule("/products/ventilators", "/products/*")).toBe(true);
    expect(matchesRule("/products-old", "/products/*")).toBe(false);
    expect(matchesRule("/anything/at/all", "/*")).toBe(true);
  });

  it("applies include and exclude modes", () => {
    expect(matchesTargeting("/blog/a", "EXCLUDE", [])).toBe(true);
    expect(matchesTargeting("/blog/a", "EXCLUDE", ["/blog/*"])).toBe(false);
    expect(matchesTargeting("/products/x", "EXCLUDE", ["/blog/*"])).toBe(true);
    expect(matchesTargeting("/products/x", "INCLUDE", ["/products/*"])).toBe(true);
    expect(matchesTargeting("/blog/x", "INCLUDE", ["/products/*"])).toBe(false);
    expect(matchesTargeting("/blog/x", "INCLUDE", [])).toBe(false);
  });

  it("never covers staff, sign-in, quotation or contact pages", () => {
    for (const path of ["/admin", "/admin/popups", "/login", "/change-password", "/rfq", "/contact", "/api/x"]) {
      expect(isAlwaysExcluded(path)).toBe(true);
      expect(matchesTargeting(path, "INCLUDE", ["/*"])).toBe(false);
      expect(matchesTargeting(path, "EXCLUDE", [])).toBe(false);
    }
    expect(isAlwaysExcluded("/products")).toBe(false);
  });

  it("summarises targeting for the table", () => {
    expect(targetingSummary("EXCLUDE", [])).toBe("All pages");
    expect(targetingSummary("INCLUDE", ["/a", "/b", "/c"])).toBe("Only /a, /b +1");
  });
});

describe("schedule", () => {
  const now = new Date("2026-10-09T10:00:00Z");

  it("is inactive whenever switched off, whatever the dates", () => {
    expect(popupState({ active: false, startsAt: null, endsAt: null }, now)).toBe("inactive");
  });

  it("treats the start as inclusive and the end as exclusive", () => {
    expect(popupState({ active: true, startsAt: now, endsAt: null }, now)).toBe("live");
    expect(popupState({ active: true, startsAt: null, endsAt: now }, now)).toBe("expired");
    expect(popupState({ active: true, startsAt: new Date(now.getTime() + 1), endsAt: null }, now)).toBe("scheduled");
    expect(popupState({ active: true, startsAt: null, endsAt: new Date(now.getTime() + 1) }, now)).toBe("live");
  });

  it("accepts ISO strings from the public payload", () => {
    expect(popupState({ active: true, startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-10-31T00:00:00Z" }, now)).toBe("live");
  });
});

describe("device and trigger", () => {
  it("matches devices", () => {
    expect(matchesDevice("ALL", true)).toBe(true);
    expect(matchesDevice("DESKTOP", true)).toBe(false);
    expect(matchesDevice("DESKTOP", false)).toBe(true);
    expect(matchesDevice("MOBILE", true)).toBe(true);
    expect(matchesDevice("MOBILE", false)).toBe(false);
  });

  it("never uses exit intent on a phone", () => {
    expect(triggerSupported("EXIT_INTENT", true)).toBe(false);
    expect(triggerSupported("EXIT_INTENT", false)).toBe(true);
    expect(triggerSupported("DELAY", true)).toBe(true);
    expect(triggerSupported("SCROLL", true)).toBe(true);
  });
});

describe("frequency", () => {
  const now = Date.UTC(2026, 9, 9);

  it("shows a popup never dismissed", () => {
    expect(frequencyAllows(null, 7, now, "s1")).toBe(true);
  });

  it("waits the configured number of days", () => {
    expect(frequencyAllows({ at: now - 6 * DAY, session: "old" }, 7, now, "s1")).toBe(false);
    expect(frequencyAllows({ at: now - 7 * DAY, session: "old" }, 7, now, "s1")).toBe(true);
  });

  it("with 0 days, never reopens in the same session but does in the next", () => {
    expect(frequencyAllows({ at: now, session: "s1" }, 0, now + DAY, "s1")).toBe(false);
    expect(frequencyAllows({ at: now, session: "s1" }, 0, now, "s2")).toBe(true);
  });
});

describe("choosing one popup", () => {
  const base: CandidatePopup = {
    id: "b",
    priority: 0,
    device: "ALL",
    trigger: "DELAY",
    frequencyDays: 7,
    startsAt: null,
    endsAt: null,
    targetMode: "EXCLUDE",
    targetRules: [],
  };
  const context: VisitContext = {
    path: "/products",
    isMobile: false,
    now: Date.UTC(2026, 9, 9),
    session: "s",
    dismissals: {},
  };

  it("returns at most one, highest priority first", () => {
    const chosen = choosePopup([base, { ...base, id: "a", priority: 5 }, { ...base, id: "c", priority: 1 }], context);
    expect(chosen?.id).toBe("a");
  });

  it("breaks ties by id, independent of input order", () => {
    const one = choosePopup([{ ...base, id: "z" }, { ...base, id: "m" }], context);
    const two = choosePopup([{ ...base, id: "m" }, { ...base, id: "z" }], context);
    expect(one?.id).toBe("m");
    expect(two?.id).toBe("m");
  });

  it("skips popups that are dismissed, off-page, off-device, off-schedule or exit intent on mobile", () => {
    const popups: CandidatePopup[] = [
      { ...base, id: "dismissed", priority: 9 },
      { ...base, id: "offpage", priority: 8, targetMode: "INCLUDE", targetRules: ["/blog/*"] },
      { ...base, id: "desktop", priority: 7, device: "DESKTOP" },
      { ...base, id: "later", priority: 6, startsAt: "2027-01-01T00:00:00Z" },
      { ...base, id: "exit", priority: 5, trigger: "EXIT_INTENT" },
      { ...base, id: "ok", priority: 1 },
    ];
    const chosen = choosePopup(popups, {
      ...context,
      isMobile: true,
      dismissals: { dismissed: { at: context.now, session: "s" } },
    });
    expect(chosen?.id).toBe("ok");
  });

  it("returns null when nothing qualifies", () => {
    expect(choosePopup([{ ...base, device: "MOBILE" }], context)).toBeNull();
    expect(choosePopup([base], { ...context, path: "/contact" })).toBeNull();
  });
});
