"use server";

import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import {
  contrastRatio,
  MINIMUM_CONTRAST,
  normaliseHexColor,
} from "@/lib/utils/color";
import {
  settingsForGroup,
  type SettingGroup,
  type SettingDefinition,
} from "./registry";
import { writeSettings } from "./service";

export type SettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

const GROUP_KEYS: SettingGroup[] = [
  "company",
  "contact",
  "social",
  "branding",
  "seo",
  "analytics",
  "legal",
];

function isGroup(value: string): value is SettingGroup {
  return (GROUP_KEYS as string[]).includes(value);
}

function validate(
  definition: SettingDefinition,
  raw: string,
): { value: string | null } | { error: string } {
  const value = raw.trim();
  if (!value) return { value: null };

  if (definition.maxLength && value.length > definition.maxLength) {
    return { error: `Must be ${definition.maxLength} characters or fewer.` };
  }

  if (definition.type === "COLOR") {
    const hex = normaliseHexColor(value);
    if (!hex) return { error: "Enter a colour as a hex code, for example #1f66dc." };

    // The primary colour is a button background with white text on it. A
    // choice that fails contrast is refused here rather than silently shipped.
    if (definition.key === "branding.primaryColor") {
      const ratio = contrastRatio(hex, "#ffffff");
      if (ratio < MINIMUM_CONTRAST) {
        return {
          error: `White text on this colour has a contrast ratio of ${ratio.toFixed(
            1,
          )}:1, below the ${MINIMUM_CONTRAST}:1 minimum. Choose a darker colour.`,
        };
      }
    }

    if (definition.key === "branding.secondaryColor") {
      const ratio = contrastRatio(hex, "#ffffff");
      if (ratio < MINIMUM_CONTRAST) {
        return {
          error: `This colour carries white text on dark surfaces; at ${ratio.toFixed(
            1,
          )}:1 it is too light to read. Choose a darker colour.`,
        };
      }
    }

    return { value: hex };
  }

  if (definition.key === "contact.email" && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value)) {
    return { error: "Enter a valid email address." };
  }

  if (definition.key === "contact.whatsapp" && !/^[0-9]{8,15}$/.test(value)) {
    return { error: "Digits only, including the country code." };
  }

  if (
    definition.group === "social" &&
    !/^https:\/\/[^\s]+$/i.test(value)
  ) {
    return { error: "Enter a full https:// URL." };
  }

  if (
    definition.group === "legal" &&
    !/^(\/[^\s]*|https:\/\/[^\s]+)$/i.test(value)
  ) {
    return { error: "Enter a path starting with / or a full https:// URL." };
  }

  if (
    definition.key === "seo.titleTemplate" &&
    !value.includes("%s")
  ) {
    return { error: "The template must contain %s for the page title." };
  }

  return { value };
}

export async function updateSettingsGroupAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const actor = await requirePermission("SETTINGS", "MANAGE_SETTINGS");

  const group = String(formData.get("group") ?? "");
  if (!isGroup(group)) return { error: "Unknown settings group." };

  const definitions = settingsForGroup(group);
  const fieldErrors: Record<string, string> = {};
  const values: Record<string, string | null> = {};

  for (const definition of definitions) {
    const raw = formData.get(definition.key);
    const result = validate(definition, typeof raw === "string" ? raw : "");

    if ("error" in result) fieldErrors[definition.key] = result.error;
    else values[definition.key] = result.value;
  }

  // Nothing is written when any field fails, so a group is never left half
  // applied with one invalid value silently dropped.
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await writeSettings(values);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SETTINGS_UPDATED",
    module: "SETTINGS",
    entityType: "Setting",
    summary: `Updated ${group} settings`,
    metadata: { group, keys: Object.keys(values) },
  });

  // Settings feed the header, footer and metadata of every page.
  revalidatePath("/", "layout");

  return { success: "Settings saved." };
}
