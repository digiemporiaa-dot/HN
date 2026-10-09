import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { clientForm, publicFormById, type ClientForm } from "@/server/forms/service";
import { effectiveCta, type EffectiveCta, type PublicCtaConfig } from "@/lib/cta/effective";
import { resolveCta, type CtaContext } from "@/lib/cta/resolve";
import { storedRules } from "@/lib/popups/rules";

/**
 * Call-to-action configurations: what the public site is told, and what the
 * server decides on a submission.
 */

const CONFIG_SELECT = {
  id: true,
  key: true,
  kind: true,
  isDefault: true,
  active: true,
  mode: true,
  popupType: true,
  heading: true,
  description: true,
  submitLabel: true,
  successMessage: true,
  fields: true,
  consentText: true,
  privacyHref: true,
  afterSubmit: true,
  redirectHref: true,
  directHref: true,
  placements: true,
  targetProductId: true,
  targetPaths: true,
  fileId: true,
  formId: true,
  updatedAt: true,
  file: { select: { id: true, storageKey: true, kind: true, deletedAt: true } },
} as const satisfies Prisma.CtaConfigSelect;

type ConfigRow = Prisma.CtaConfigGetPayload<{ select: typeof CONFIG_SELECT }>;

/** A configuration as the server uses it: the public shape plus the file it may release. */
export type ServerCta = EffectiveCta & {
  /** The catalogue file to release, read from the configuration, never from the request. */
  file: { id: string; storageKey: string } | null;
  formId: string | null;
};

function usableFile(row: ConfigRow) {
  return row.file && !row.file.deletedAt && row.file.kind === "DOCUMENT" ? row.file : null;
}

function toPublic(row: ConfigRow, form: ClientForm | null): PublicCtaConfig {
  const file = usableFile(row);
  const gated = row.mode === "POPUP" && row.popupType === "GATED_DOWNLOAD";
  return {
    key: row.key,
    kind: row.kind,
    isDefault: row.isDefault,
    placements: row.placements,
    targetProductId: row.targetProductId,
    targetPaths: storedRules(row.targetPaths),
    updatedAt: row.updatedAt.toISOString(),
    mode: row.mode,
    popupType: row.popupType,
    heading: row.heading,
    description: row.description,
    submitLabel: row.submitLabel,
    successMessage: row.successMessage,
    fields: row.fields,
    consentText: row.consentText,
    privacyHref: row.privacyHref,
    afterSubmit: row.afterSubmit,
    redirectHref: row.redirectHref,
    directHref: row.directHref,
    hasFile: Boolean(file),
    // A gated file's address is never sent: it is reachable only through a
    // grant, and handing out the address would hand out the file.
    fileHref: file && !gated ? publicUrlForKey(file.storageKey) : null,
    formKey: form?.key ?? null,
  };
}

async function activeRows(): Promise<ConfigRow[]> {
  return prisma.ctaConfig.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: CONFIG_SELECT,
  });
}

export type PublicCtaPayload = {
  configs: PublicCtaConfig[];
  /** Published forms used by Custom form configurations, by key. */
  forms: Record<string, ClientForm>;
};

/** Every live configuration, in its public shape, for the controller. */
export async function livePublicCtaConfigs(): Promise<PublicCtaPayload> {
  const rows = await activeRows();
  const forms: Record<string, ClientForm> = {};
  const formIds = [...new Set(rows.flatMap((row) => (row.popupType === "CUSTOM_FORM" && row.formId ? [row.formId] : [])))];
  const loaded = await Promise.all(formIds.map((id) => publicFormById(id)));
  const byId = new Map<string, ClientForm>();
  for (const form of loaded) {
    if (!form) continue;
    const client = clientForm(form);
    byId.set(form.id, client);
    forms[client.key] = client;
  }
  return {
    configs: rows.map((row) => toPublic(row, row.formId ? (byId.get(row.formId) ?? null) : null)),
    forms,
  };
}

/**
 * The configuration a submission is held to, worked out on the server from
 * the button's declared kind, placement and choice, the product and the page.
 *
 * Read fresh from the database rather than from the public cache, so a
 * configuration switched off a moment ago no longer applies.
 */
export async function resolveServerCta(context: CtaContext): Promise<ServerCta> {
  const rows = await activeRows();
  const candidates = rows.map((row) => ({ row, resolvable: toPublic(row, null) }));
  const chosen = resolveCta(
    candidates.map((candidate) => candidate.resolvable),
    context,
  );
  const row = chosen ? candidates.find((candidate) => candidate.resolvable === chosen)!.row : null;
  const effective = effectiveCta(context.kind, chosen);
  const file = row ? usableFile(row) : null;
  return {
    ...effective,
    file: file ? { id: file.id, storageKey: file.storageKey } : null,
    formId: row?.formId ?? null,
  };
}

/* ---------------------------------------------------------------- admin -- */

const LIST_SELECT = {
  id: true,
  key: true,
  name: true,
  kind: true,
  isDefault: true,
  active: true,
  mode: true,
  popupType: true,
  placements: true,
  targetPaths: true,
  updatedAt: true,
  targetProduct: { select: { id: true, name: true } },
  updatedBy: { select: { name: true } },
} as const satisfies Prisma.CtaConfigSelect;

export type CtaConfigRow = Prisma.CtaConfigGetPayload<{ select: typeof LIST_SELECT }>;

export async function listCtaConfigs(): Promise<CtaConfigRow[]> {
  return prisma.ctaConfig.findMany({
    where: { deletedAt: null },
    orderBy: [{ kind: "asc" }, { isDefault: "desc" }, { updatedAt: "desc" }],
    take: 500,
    select: LIST_SELECT,
  });
}

export async function findCtaConfig(id: string) {
  return prisma.ctaConfig.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...CONFIG_SELECT,
      name: true,
      targetProduct: { select: { id: true, name: true } },
      file: { select: { id: true, storageKey: true, kind: true, deletedAt: true, originalName: true, title: true } },
    },
  });
}

export type CtaConfigDetail = NonNullable<Awaited<ReturnType<typeof findCtaConfig>>>;

/** What the editor's pickers offer: published products, document files and published forms. */
export async function ctaEditorOptions() {
  const [products, files, forms] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      take: 1000,
      select: { id: true, name: true, modelNumber: true, status: true },
    }),
    prisma.mediaAsset.findMany({
      where: { deletedAt: null, kind: "DOCUMENT" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, originalName: true, title: true },
    }),
    prisma.form.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, key: true },
    }),
  ]);
  return { products, files, forms };
}

/** Configurations a page-builder button may choose, by kind. */
export async function ctaConfigChoices() {
  return prisma.ctaConfig.findMany({
    where: { deletedAt: null },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: { key: true, name: true, kind: true, active: true },
  });
}
