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
import { GA4_ID, GTM_ID, VERIFICATION_TOKEN } from "@/lib/seo/tracking";

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
  "mail",
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
    if (!hex)
      return { error: "Enter a colour as a hex code, for example #1f66dc." };

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

  if (
    definition.key === "contact.email" &&
    !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value)
  ) {
    return { error: "Enter a valid email address." };
  }

  if (definition.key === "contact.whatsapp" && !/^[0-9]{8,15}$/.test(value)) {
    return { error: "Digits only, including the country code." };
  }

  // These end up inside a script or meta tag, so only the documented format
  // is accepted; anything else could carry markup into every page.
  if (
    definition.key === "backups.schedule" &&
    !["off", "daily", "weekly"].includes(value.toLowerCase())
  ) {
    return { error: "Enter off, daily or weekly." };
  }
  if (definition.key === "backups.hour") {
    const hour = Number(value);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return { error: "Enter a whole hour from 0 to 23." };
    }
  }
  if (definition.key === "backups.keep") {
    const keep = Number(value);
    if (!Number.isInteger(keep) || keep < 1 || keep > 365) {
      return { error: "Keep between 1 and 365 automatic backups." };
    }
  }

  if (definition.key === "analytics.ga4Id" && !GA4_ID.test(value)) {
    return { error: "A GA4 measurement ID looks like G-XXXXXXXXXX." };
  }
  if (definition.key === "analytics.gtmId" && !GTM_ID.test(value)) {
    return { error: "A Tag Manager container ID looks like GTM-XXXXXXX." };
  }
  if (
    (definition.key === "seo.googleVerification" ||
      definition.key === "seo.bingVerification") &&
    !VERIFICATION_TOKEN.test(value)
  ) {
    return {
      error:
        "Paste only the content value from the tag: letters, digits, dashes and underscores.",
    };
  }

  if (definition.group === "social" && !/^https:\/\/[^\s]+$/i.test(value)) {
    return { error: "Enter a full https:// URL." };
  }

  if (
    definition.group === "legal" &&
    !/^(\/[^\s]*|https:\/\/[^\s]+)$/i.test(value)
  ) {
    return { error: "Enter a path starting with / or a full https:// URL." };
  }

  if (definition.key === "seo.titleTemplate" && !value.includes("%s")) {
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
    const text = typeof raw === "string" ? raw : "";

    // A secret is never sent to the browser, so the form cannot post it back.
    // Blank therefore means "leave it alone" rather than "clear it"; clearing
    // one is done with the button beside the field.
    if (definition.isSecret && text.trim() === "") {
      if (formData.get(`${definition.key}.clear`) === "on") {
        values[definition.key] = null;
      }
      continue;
    }

    const result = validate(definition, text);

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
