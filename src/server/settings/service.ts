import { cache } from "react";

import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { SETTINGS, SETTINGS_BY_KEY } from "./registry";

export type SettingValues = Record<string, string | null>;

/**
 * All settings for the current request.
 *
 * Cached per request because almost every page reads several of these — the
 * header alone wants the company name, logo and phone number — and they should
 * cost one query between them, not one each.
 */
export const getSettings = cache(async (): Promise<SettingValues> => {
  const rows = await prisma.setting.findMany({
    select: { key: true, value: true },
  });

  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const values: SettingValues = {};

  // Defaults come from the registry rather than the database, so a fresh
  // install renders sensibly before anyone opens the settings screen.
  for (const definition of SETTINGS) {
    const value = stored.get(definition.key);
    values[definition.key] =
      value !== undefined && value !== null && value !== ""
        ? value
        : (definition.defaultValue ?? null);
  }

  return values;
});

/**
 * Settings safe to hand to the browser. Anything marked secret is dropped, so
 * a future API key cannot leak by being rendered into a payload.
 */
export async function getPublicSettings(): Promise<SettingValues> {
  const values = await getSettings();
  const publicValues: SettingValues = {};

  for (const definition of SETTINGS) {
    if (definition.isSecret) continue;
    publicValues[definition.key] = values[definition.key] ?? null;
  }

  return publicValues;
}

export async function getSetting(key: string): Promise<string | null> {
  const values = await getSettings();
  return values[key] ?? null;
}

/** Resolves a MEDIA setting to a served URL. */
export const getSettingImageUrl = cache(
  async (key: string): Promise<string | null> => {
    const assetId = await getSetting(key);
    if (!assetId) return null;

    const asset = await prisma.mediaAsset.findFirst({
      where: { id: assetId, deletedAt: null },
      select: { storageKey: true },
    });

    return asset ? publicUrlForKey(asset.storageKey) : null;
  },
);

/**
 * Convenience bundle for the public site, so a layout does not need to know
 * individual setting keys.
 */
export const getSiteSettings = cache(async () => {
  const [values, logoUrl, faviconUrl, ogImageUrl] = await Promise.all([
    getSettings(),
    getSettingImageUrl("branding.logo"),
    getSettingImageUrl("branding.favicon"),
    getSettingImageUrl("seo.ogImage"),
  ]);

  return {
    companyName: values["company.name"] ?? "HN Medical System",
    tagline: values["company.tagline"] ?? null,
    description: values["company.description"] ?? null,
    gstin: values["company.gstin"] ?? null,

    email: values["contact.email"] ?? null,
    phone: values["contact.phone"] ?? null,
    whatsapp: values["contact.whatsapp"] ?? null,
    address: values["contact.address"] ?? null,
    hours: values["contact.hours"] ?? null,

    social: {
      linkedin: values["social.linkedin"] ?? null,
      facebook: values["social.facebook"] ?? null,
      instagram: values["social.instagram"] ?? null,
      youtube: values["social.youtube"] ?? null,
      x: values["social.x"] ?? null,
    },

    logoUrl,
    faviconUrl,
    ogImageUrl,
    primaryColor: values["branding.primaryColor"] ?? null,
    secondaryColor: values["branding.secondaryColor"] ?? null,

    seo: {
      defaultTitle: values["seo.defaultTitle"] ?? "HN Medical System",
      titleTemplate: values["seo.titleTemplate"] ?? "%s | HN Medical System",
      defaultDescription:
        values["seo.defaultDescription"] ??
        values["company.description"] ??
        null,
      /**
       * Whole-site opt-out of indexing, for staging deployments.
       *
       * Read as a string because every setting is stored as one; anything that
       * is not exactly "true" leaves the site indexable, so a malformed value
       * can never silently hide a production site from search.
       */
      noindex: values["seo.noindex"] === "true",
    },

    analytics: {
      ga4Id: values["analytics.ga4Id"] ?? null,
      gtmId: values["analytics.gtmId"] ?? null,
    },

    legal: {
      privacyUrl: values["legal.privacyUrl"] ?? null,
      termsUrl: values["legal.termsUrl"] ?? null,
      cookiesUrl: values["legal.cookiesUrl"] ?? null,
    },
  };
});

export type SiteSettings = Awaited<ReturnType<typeof getSiteSettings>>;

/** Writes a batch of settings, creating rows that do not exist yet. */
export async function writeSettings(
  values: Record<string, string | null>,
): Promise<void> {
  const entries = Object.entries(values).filter(([key]) =>
    SETTINGS_BY_KEY.has(key),
  );

  await prisma.$transaction(
    entries.map(([key, value]) => {
      const definition = SETTINGS_BY_KEY.get(key)!;
      return prisma.setting.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          group: definition.group,
          type: definition.type,
          label: definition.label,
          description: definition.description,
          value,
          isSecret: definition.isSecret ?? false,
        },
      });
    }),
  );
}
