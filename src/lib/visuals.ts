/**
 * The house imagery, and how a record without a picture borrows one.
 *
 * Every image here ships with the application in /public/images/hn, rendered
 * for HN Medical rather than licensed, so it can be shown on any deployment.
 * A record an editor has given its own image always uses that; these are only
 * the graceful default, chosen by what the record is called so a ventilator
 * category falls back to a respiratory picture rather than a random one.
 */

export type Visual = { url: string; alt: string };

const BASE = "/images/hn";

export const SCENES = {
  hero: { url: `${BASE}/scenes/hero-ot.webp`, alt: "A modern operating theatre with LED surgical lights, an anaesthesia workstation and an operating table" },
  heroIcu: { url: `${BASE}/scenes/hero-icu.webp`, alt: "An intensive care room equipped with an ICU bed, ventilator and patient monitoring" },
  icu: { url: `${BASE}/scenes/icu.webp`, alt: "An intensive care unit bay with an ICU bed, ventilator and ceiling pendant" },
  icuAlt: { url: `${BASE}/scenes/icu-b.webp`, alt: "Bedside view of an equipped intensive care bay" },
  ot: { url: `${BASE}/scenes/ot.webp`, alt: "An operating theatre with surgical lights over the operating table" },
  otAlt: { url: `${BASE}/scenes/ot-b.webp`, alt: "Operating theatre with anaesthesia workstation and ceiling-mounted lights" },
  emergency: { url: `${BASE}/scenes/emergency.webp`, alt: "An emergency bay with a stretcher, crash cart and suction unit" },
  diagnostics: { url: `${BASE}/scenes/diagnostics.webp`, alt: "A diagnostic room with an ultrasound system and examination couch" },
  diagnosticsAlt: { url: `${BASE}/scenes/diagnostics-b.webp`, alt: "Ultrasound system beside an examination couch" },
  nicu: { url: `${BASE}/scenes/nicu.webp`, alt: "A neonatal care room with an infant incubator, radiant warmer and phototherapy unit" },
  ward: { url: `${BASE}/scenes/ward.webp`, alt: "A hospital ward with patient beds, bedside lockers and privacy curtains" },
  corridor: { url: `${BASE}/scenes/corridor.webp`, alt: "A bright hospital corridor" },
  station: { url: `${BASE}/scenes/station.webp`, alt: "A nurses' station with central monitoring screens" },
} as const satisfies Record<string, Visual>;

export type SceneKey = keyof typeof SCENES;

const CATEGORY = (key: string, alt: string): Visual => ({
  url: `${BASE}/categories/${key}.webp`,
  alt,
});

export const CATEGORY_VISUALS = {
  patientMonitoring: CATEGORY("patient-monitoring", "Multi-parameter patient monitor"),
  criticalCare: CATEGORY("critical-care", "ICU ventilator"),
  operationTheatre: CATEGORY("operation-theatre", "LED operation theatre light"),
  anaesthesia: CATEGORY("anaesthesia", "Anaesthesia workstation"),
  surgical: CATEGORY("surgical-equipment", "Electrosurgical unit with footswitch"),
  diagnostic: CATEGORY("diagnostic-equipment", "Ultrasound system"),
  respiratory: CATEGORY("respiratory-care", "High-flow respiratory therapy system"),
  neonatal: CATEGORY("neonatal-care", "Infant radiant warmer"),
  emergency: CATEGORY("emergency-care", "Defibrillator"),
  furniture: CATEGORY("hospital-furniture", "Motorised ICU bed"),
} as const satisfies Record<string, Visual>;

type Rule<T> = [RegExp, T];

const CATEGORY_RULES: Rule<keyof typeof CATEGORY_VISUALS>[] = [
  [/monitor|telemetry|vital/i, "patientMonitoring"],
  [/anaesth|anesth|vapor/i, "anaesthesia"],
  [/respirat|oxygen|cpap|bipap|high.?flow|nebul/i, "respiratory"],
  [/critical|icu|intensive|ventilat|infusion|syringe/i, "criticalCare"],
  [/theatre|theater|\bot\b|operating|surgical light|ot light|pendant|table/i, "operationTheatre"],
  [/surg|electro|cautery|suction|instrument/i, "surgical"],
  [/diagnos|imaging|ultra|ecg|radiol|x-?ray|lab/i, "diagnostic"],
  [/neonat|infant|baby|nicu|incubat|warmer|photother/i, "neonatal"],
  [/emergen|defib|resus|crash|trauma|stretcher|ambulance/i, "emergency"],
  [/furniture|bed|trolley|locker|cabinet|ward/i, "furniture"],
];

const SCENE_RULES: Rule<SceneKey>[] = [
  [/neonat|infant|baby|nicu|paediat|pediat|incubat/i, "nicu"],
  [/emergen|trauma|casualty|resus|defib|crash/i, "emergency"],
  [/anaesth|anesth/i, "otAlt"],
  [/ortho|joint|spine/i, "otAlt"],
  [/theatre|theater|\bot\b|operat|surg/i, "ot"],
  [/radiol|imaging|diagnos|ultra|scan|gyn|obstet|matern/i, "diagnostics"],
  [/cardio|cardiac|heart|cath/i, "icuAlt"],
  [/critical|icu|intensive|ventilat|respirat/i, "icu"],
  [/monitor|central|telemetry|nurs/i, "station"],
  [/ward|bed|general medicine|inpatient/i, "ward"],
  [/hospital|setup|turnkey|infrastructure|project|planning|procure/i, "corridor"],
];

function match<T>(rules: Rule<T>[], text: string): T | null {
  for (const [pattern, value] of rules) if (pattern.test(text)) return value;
  return null;
}

/** A small deterministic hash so the same name always gets the same picture. */
function pick<T>(list: readonly T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return list[Math.abs(hash) % list.length];
}

const ALL_CATEGORY = Object.values(CATEGORY_VISUALS);
const ROOM_SCENES: SceneKey[] = ["icu", "ot", "emergency", "diagnostics", "nicu", "ward", "station", "corridor"];

/** An equipment picture for a category (or a product with no photograph). */
export function categoryVisual(name: string): Visual {
  const key = match(CATEGORY_RULES, name);
  return key ? CATEGORY_VISUALS[key] : pick(ALL_CATEGORY, name);
}

/** A clinical environment for a specialty, solution, application or article. */
export function sceneVisual(name: string): Visual {
  const key = match(SCENE_RULES, name) ?? pick(ROOM_SCENES, name);
  return SCENES[key];
}

export type VisualKind = "category" | "product" | "specialty" | "solution" | "application" | "post" | "city";

/** The record's own image when it has one, otherwise the closest house image. */
export function visualFor(
  kind: VisualKind,
  name: string,
  image: Visual | null | undefined,
): Visual {
  if (image?.url) return { url: image.url, alt: image.alt || name };
  const visual =
    kind === "category" || kind === "product"
      ? categoryVisual(name)
      : sceneVisual(name);
  // The fallback describes the picture, not the record, so a reader is never
  // told a stock room is the thing they clicked on.
  return visual;
}

/** True for house imagery, which is pre-sized and needs no re-encoding. */
export function isStatic(url: string): boolean {
  return url.startsWith(`${BASE}/`);
}
