import type { SettingType } from "@/generated/prisma/enums";

/**
 * Every global setting, declared once.
 *
 * Seeding, validation, the admin form and the typed accessors all derive from
 * this list, so a setting that is not here does not exist anywhere — and adding
 * one is a single edit rather than four.
 */

export type SettingGroup =
  | "company"
  | "contact"
  | "social"
  | "branding"
  | "seo"
  | "analytics"
  | "legal"
  | "mail"
  | "backups"
  | "security";

export type SettingDefinition = {
  key: string;
  group: SettingGroup;
  type: SettingType;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  /** Secret values are never serialised to the browser. */
  isSecret?: boolean;
  maxLength?: number;
};

export const SETTING_GROUPS: Array<{
  key: SettingGroup;
  label: string;
  description: string;
}> = [
  {
    key: "company",
    label: "Company",
    description: "How the business is named and described across the site.",
  },
  {
    key: "contact",
    label: "Contact",
    description:
      "Used by every call-to-action. Changing a number here changes it everywhere.",
  },
  {
    key: "social",
    label: "Social profiles",
    description: "Links shown in the footer. Leave blank to hide one.",
  },
  {
    key: "branding",
    label: "Branding",
    description: "Logo, favicon and brand colours.",
  },
  {
    key: "seo",
    label: "Default SEO",
    description: "Fallbacks for pages that do not set their own metadata.",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Measurement IDs. Scripts load only when an ID is present.",
  },
  {
    key: "mail",
    label: "Email",
    description:
      "Outgoing mail. Until a host is set, enquiries are still recorded but nobody is notified.",
  },
  {
    key: "legal",
    label: "Legal",
    description: "Policy links shown in the footer.",
  },
  {
    key: "backups",
    label: "Backups",
    description:
      "Automatic backups of the database and every uploaded file. Archives are listed, downloaded and restored under Backups.",
  },
  {
    key: "security",
    label: "Security",
    description: "Sign-in requirements for staff.",
  },
];

export const SETTINGS: SettingDefinition[] = [
  // --- company -------------------------------------------------------------
  {
    key: "company.name",
    group: "company",
    type: "STRING",
    label: "Company name",
    defaultValue: "HN Medical System",
    maxLength: 120,
  },
  {
    key: "company.tagline",
    group: "company",
    type: "STRING",
    label: "Tagline",
    description: "One line shown beneath the name in the footer.",
    defaultValue:
      "Medical, surgical and hospital equipment for healthcare institutions",
    maxLength: 200,
  },
  {
    key: "company.description",
    group: "company",
    type: "TEXT",
    label: "Short description",
    description: "Used as the default meta description when none is set.",
    defaultValue:
      "B2B supplier of medical, surgical and hospital equipment to healthcare institutions across India.",
    maxLength: 400,
  },
  {
    key: "company.gstin",
    group: "company",
    type: "STRING",
    label: "GSTIN",
    description: "Shown in the footer only if provided.",
    maxLength: 20,
  },

  // --- contact -------------------------------------------------------------
  {
    key: "contact.email",
    group: "contact",
    type: "STRING",
    label: "Sales email",
    placeholder: "sales@example.com",
    maxLength: 254,
  },
  {
    key: "contact.phone",
    group: "contact",
    type: "STRING",
    label: "Phone number",
    description: "Shown as a click-to-call link.",
    placeholder: "+91 00000 00000",
    maxLength: 32,
  },
  {
    key: "contact.whatsapp",
    group: "contact",
    type: "STRING",
    label: "WhatsApp number",
    description: "Digits and country code only, no spaces or symbols.",
    placeholder: "919000000000",
    maxLength: 20,
  },
  {
    key: "contact.address",
    group: "contact",
    type: "TEXT",
    label: "Office address",
    maxLength: 400,
  },
  {
    key: "contact.hours",
    group: "contact",
    type: "STRING",
    label: "Business hours",
    placeholder: "Monday to Saturday, 9:30am – 6:30pm IST",
    maxLength: 120,
  },

  // --- social --------------------------------------------------------------
  {
    key: "social.linkedin",
    group: "social",
    type: "STRING",
    label: "LinkedIn URL",
    maxLength: 300,
  },
  {
    key: "social.facebook",
    group: "social",
    type: "STRING",
    label: "Facebook URL",
    maxLength: 300,
  },
  {
    key: "social.instagram",
    group: "social",
    type: "STRING",
    label: "Instagram URL",
    maxLength: 300,
  },
  {
    key: "social.youtube",
    group: "social",
    type: "STRING",
    label: "YouTube URL",
    maxLength: 300,
  },
  {
    key: "social.x",
    group: "social",
    type: "STRING",
    label: "X (Twitter) URL",
    maxLength: 300,
  },

  // --- branding ------------------------------------------------------------
  {
    key: "branding.logo",
    group: "branding",
    type: "MEDIA",
    label: "Logo",
    description:
      "Shown in the site header. SVG or PNG with transparency works best.",
  },
  {
    key: "branding.favicon",
    group: "branding",
    type: "MEDIA",
    label: "Favicon",
    description: "Square image, ideally 512×512.",
  },
  {
    key: "branding.primaryColor",
    group: "branding",
    type: "COLOR",
    label: "Primary colour",
    description:
      "Used for primary buttons and links. Must stay legible against white text.",
    placeholder: "#1f66dc",
  },
  {
    key: "branding.secondaryColor",
    group: "branding",
    type: "COLOR",
    label: "Secondary colour",
    description: "Used for dark surfaces such as the footer.",
    placeholder: "#12233a",
  },

  // --- seo -----------------------------------------------------------------
  {
    key: "seo.defaultTitle",
    group: "seo",
    type: "STRING",
    label: "Default page title",
    defaultValue: "HN Medical System",
    maxLength: 120,
  },
  {
    key: "seo.titleTemplate",
    group: "seo",
    type: "STRING",
    label: "Title template",
    description: "Use %s where the page title should appear.",
    defaultValue: "%s | HN Medical System",
    maxLength: 120,
  },
  {
    key: "seo.defaultDescription",
    group: "seo",
    type: "TEXT",
    label: "Default meta description",
    maxLength: 320,
  },
  {
    key: "seo.ogImage",
    group: "seo",
    type: "MEDIA",
    label: "Default social share image",
    description: "Used when a page has no image of its own. 1200×630 is ideal.",
  },
  {
    key: "seo.noindex",
    group: "seo",
    type: "BOOLEAN",
    label: "Ask search engines not to index this site",
    description:
      "For staging and pre-launch sites. Turns the whole site away in robots.txt and adds a noindex tag to every page. Leave off in production.",
    defaultValue: "false",
  },
  {
    key: "seo.googleVerification",
    group: "seo",
    type: "STRING",
    label: "Google Search Console verification",
    description:
      "The content value of the HTML tag Search Console offers, without the rest of the tag.",
    placeholder: "abc123…",
    maxLength: 100,
  },
  {
    key: "seo.bingVerification",
    group: "seo",
    type: "STRING",
    label: "Bing Webmaster Tools verification",
    description: "The content value of the msvalidate.01 tag.",
    maxLength: 100,
  },

  // --- analytics -----------------------------------------------------------
  {
    key: "analytics.ga4Id",
    group: "analytics",
    type: "STRING",
    label: "Google Analytics 4 measurement ID",
    placeholder: "G-XXXXXXXXXX",
    maxLength: 40,
  },
  {
    key: "analytics.gtmId",
    group: "analytics",
    type: "STRING",
    label: "Google Tag Manager container ID",
    placeholder: "GTM-XXXXXXX",
    maxLength: 40,
  },

  // --- mail ----------------------------------------------------------------
  {
    key: "mail.host",
    group: "mail",
    type: "STRING",
    label: "SMTP host",
    placeholder: "smtp.example.com",
    description: "Leave blank to disable outgoing email entirely.",
    maxLength: 200,
  },
  {
    key: "mail.port",
    group: "mail",
    type: "NUMBER",
    label: "SMTP port",
    defaultValue: "587",
    description: "587 for STARTTLS, 465 for implicit TLS.",
  },
  {
    key: "mail.secure",
    group: "mail",
    type: "BOOLEAN",
    label: "Connect over TLS immediately",
    description:
      "On for port 465. Off for 587, which upgrades to TLS after connecting.",
    defaultValue: "false",
  },
  {
    key: "mail.user",
    group: "mail",
    type: "STRING",
    label: "SMTP username",
    maxLength: 200,
  },
  {
    key: "mail.password",
    group: "mail",
    type: "STRING",
    label: "SMTP password",
    isSecret: true,
    maxLength: 400,
  },
  {
    key: "mail.from",
    group: "mail",
    type: "STRING",
    label: "Send from",
    description: "The address notifications appear to come from.",
    placeholder: "website@example.com",
    maxLength: 200,
  },
  {
    key: "mail.notifyTo",
    group: "mail",
    type: "STRING",
    label: "Notify these addresses",
    description:
      "Comma separated. Blank falls back to the contact email address.",
    maxLength: 400,
  },

  // --- legal ---------------------------------------------------------------
  {
    key: "legal.privacyUrl",
    group: "legal",
    type: "STRING",
    label: "Privacy policy URL",
    defaultValue: "/privacy",
    maxLength: 300,
  },
  {
    key: "legal.termsUrl",
    group: "legal",
    type: "STRING",
    label: "Terms of use URL",
    defaultValue: "/terms",
    maxLength: 300,
  },
  {
    key: "legal.cookiesUrl",
    group: "legal",
    type: "STRING",
    label: "Cookie policy URL",
    maxLength: 300,
  },

  // --- backups -------------------------------------------------------------
  {
    key: "backups.schedule",
    group: "backups",
    type: "STRING",
    label: "Automatic backups",
    description: "off, daily or weekly. Weekly backups run on Sundays.",
    placeholder: "daily",
    defaultValue: "daily",
    maxLength: 10,
  },
  {
    key: "backups.hour",
    group: "backups",
    type: "NUMBER",
    label: "Hour to run (India time, 0–23)",
    description: "Pick a quiet hour. 2 means 2 am.",
    defaultValue: "2",
    maxLength: 2,
  },
  {
    key: "backups.keep",
    group: "backups",
    type: "NUMBER",
    label: "Automatic backups to keep",
    description:
      "Older automatic backups beyond this number are deleted. Manual backups are kept until someone deletes them.",
    defaultValue: "14",
    maxLength: 3,
  },

  // --- security ------------------------------------------------------------
  {
    key: "security.twoFactor",
    group: "security",
    type: "STRING",
    label: "Require two-factor authentication",
    description:
      "privileged (recommended): anyone who can manage staff, roles or settings, or download or restore backups, must set up an authenticator app before using the admin. everyone: all staff. off: optional for all.",
    placeholder: "privileged",
    defaultValue: "privileged",
    maxLength: 12,
  },
];

export const SETTINGS_BY_KEY = new Map(
  SETTINGS.map((setting) => [setting.key, setting]),
);

export function settingsForGroup(group: SettingGroup): SettingDefinition[] {
  return SETTINGS.filter((setting) => setting.group === group);
}
