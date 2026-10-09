import { describe, expect, it } from "vitest";

import { createPopupMemory, DISMISSALS_KEY } from "@/lib/popups/storage";
import { frequencyAllows } from "@/lib/popups/rules";
import {
  displayIstDateTime,
  formatIstDateTime,
  parseDisplayDate,
  parseIsoDate,
  parseIstDateTime,
  todayIst,
} from "@/lib/dates/ist";
import { settleToggle, TOGGLE_NETWORK_ERROR } from "@/lib/ui/persisted-toggle";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

const broken = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceeded");
  },
};

describe("popup memory", () => {
  it("persists dismissals and a session id", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    const memory = createPopupMemory(local, session);
    const id = memory.session();
    expect(memory.session()).toBe(id);
    memory.dismiss("p1", 1000);
    expect(JSON.parse(local.data.get(DISMISSALS_KEY) ?? "{}").p1).toEqual({ at: 1000, session: id });
    // A second instance (a reload) reads the same state.
    const again = createPopupMemory(local, session);
    expect(again.dismissals().p1?.at).toBe(1000);
    expect(again.session()).toBe(id);
  });

  it("falls back to memory when storage throws, so a closed popup stays closed", () => {
    const memory = createPopupMemory(broken, broken);
    const session = memory.session();
    memory.dismiss("p1", 5000);
    const record = memory.dismissals().p1 ?? null;
    expect(record).toEqual({ at: 5000, session });
    // Frequency 0: not again in this interaction.
    expect(frequencyAllows(record, 0, 6000, memory.session())).toBe(false);
  });

  it("ignores corrupt stored data", () => {
    const local = memoryStorage();
    local.setItem(DISMISSALS_KEY, "{not json");
    expect(createPopupMemory(local, memoryStorage()).dismissals()).toEqual({});
    local.setItem(DISMISSALS_KEY, JSON.stringify({ a: { at: "x" }, b: { at: 1, session: "s" } }));
    expect(createPopupMemory(local, memoryStorage()).dismissals()).toEqual({ b: { at: 1, session: "s" } });
  });
});

describe("IST dates", () => {
  it("reads wall-clock time in India regardless of the host time zone", () => {
    const instant = parseIstDateTime("2026-10-09T09:00");
    expect(instant?.toISOString()).toBe("2026-10-09T03:30:00.000Z");
    expect(formatIstDateTime(instant as Date)).toBe("2026-10-09T09:00");
  });

  it("does not shift the day around midnight", () => {
    const instant = parseIstDateTime("2026-10-10T00:15");
    expect(instant?.toISOString()).toBe("2026-10-09T18:45:00.000Z");
    expect(formatIstDateTime(instant as Date)).toBe("2026-10-10T00:15");
    expect(todayIst(new Date("2026-10-09T19:00:00Z"))).toEqual({ year: 2026, month: 10, day: 10 });
  });

  it("parses DD/MM/YYYY day first and rejects impossible dates", () => {
    expect(parseDisplayDate("03/04/2026")).toEqual({ year: 2026, month: 4, day: 3 });
    expect(parseDisplayDate("31/02/2026")).toBeNull();
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(parseIsoDate("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseIstDateTime("2026-10-09T24:00")).toBeNull();
  });

  it("displays in DD/MM/YYYY with the zone", () => {
    expect(displayIstDateTime("2026-10-09T03:30:00Z")).toBe("09/10/2026, 09:00 IST");
  });
});

describe("persisted switch", () => {
  it("keeps the new value on success", async () => {
    expect(await settleToggle(false, true, async () => ({ ok: true }))).toEqual({ value: true, error: null });
  });

  it("takes the server's value when it reports one", async () => {
    expect(await settleToggle(false, true, async () => ({ ok: true, value: false }))).toEqual({ value: false, error: null });
  });

  it("rolls back and explains a refusal", async () => {
    expect(await settleToggle(false, true, async () => ({ ok: false, error: "No form" }))).toEqual({ value: false, error: "No form" });
  });

  it("rolls back on a failed request", async () => {
    const result = await settleToggle(true, false, async () => {
      throw new Error("offline");
    });
    expect(result).toEqual({ value: true, error: TOGGLE_NETWORK_ERROR });
  });
});
