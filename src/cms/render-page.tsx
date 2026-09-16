import { Section } from "@/components/ui";
import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import {
  CARD_STYLE,
  DEFAULT_SECTION_DESIGN,
  IMAGE_POSITION,
  isValidAnchorId,
  SECTION_ALIGN,
  SECTION_BACKGROUND,
  SECTION_COLUMNS,
  SECTION_CONTAINER,
  SECTION_SPACING,
  type SectionDesign,
} from "@/lib/design/section-options";
import { contentSchemaFor, getSectionDefinition } from "./sections/definitions";
import {
  entityKey,
  resolveEntities,
  type EntityRequest,
  type ResolvedEntity,
} from "./sections/entities";
import { SECTION_RENDERERS } from "./sections/renderers";
import { publicForm, type PublicForm } from "@/server/forms/service";

export type StoredSection = {
  id: string;
  type: string;
  order: number;
  enabled: boolean;
  anchorId: string | null;
  content: unknown;
  design: unknown;
};

/**
 * Design values arrive as JSON and are narrowed to the permitted options here.
 * Anything unrecognised falls back to the default rather than reaching a class
 * name, which is what keeps a malformed or hand-edited row from producing
 * arbitrary styling.
 */
function normaliseDesign(raw: unknown, anchorId: string | null): SectionDesign {
  const source = (raw ?? {}) as Record<string, unknown>;
  const pick = <T extends readonly string[]>(
    value: unknown,
    allowed: T,
    fallback: T[number],
  ): T[number] =>
    typeof value === "string" && (allowed as readonly string[]).includes(value)
      ? (value as T[number])
      : fallback;

  return {
    spacing: pick(
      source.spacing,
      SECTION_SPACING,
      DEFAULT_SECTION_DESIGN.spacing,
    ),
    container: pick(
      source.container,
      SECTION_CONTAINER,
      DEFAULT_SECTION_DESIGN.container,
    ),
    background: pick(
      source.background,
      SECTION_BACKGROUND,
      DEFAULT_SECTION_DESIGN.background,
    ),
    align: pick(source.align, SECTION_ALIGN, DEFAULT_SECTION_DESIGN.align!),
    columns: pick(
      source.columns,
      SECTION_COLUMNS,
      DEFAULT_SECTION_DESIGN.columns!,
    ),
    cardStyle: pick(
      source.cardStyle,
      CARD_STYLE,
      DEFAULT_SECTION_DESIGN.cardStyle!,
    ),
    imagePosition: pick(
      source.imagePosition,
      IMAGE_POSITION,
      DEFAULT_SECTION_DESIGN.imagePosition!,
    ),
    anchorId: anchorId && isValidAnchorId(anchorId) ? anchorId : undefined,
  };
}

export type ResolvedMedia = { url: string; alt: string };

/** Resolves every MEDIA field on the page in one query rather than per section. */
async function resolveMedia(
  sections: StoredSection[],
): Promise<Map<string, ResolvedMedia>> {
  const ids = new Set<string>();

  for (const section of sections) {
    const definition = getSectionDefinition(section.type);
    if (!definition) continue;
    const content = (section.content ?? {}) as Record<string, unknown>;

    for (const field of definition.fields) {
      if (field.kind === "media") {
        const value = content[field.name];
        if (typeof value === "string" && value) ids.add(value);
        continue;
      }

      // Repeater rows carry images too — a gallery, a set of image cards — and
      // they are collected here so a twenty-image gallery still costs the page
      // one query rather than twenty.
      if (field.kind !== "repeater") continue;
      const children = field.fields.filter((child) => child.kind === "media");
      if (children.length === 0) continue;

      const stored = content[field.name];
      if (!Array.isArray(stored)) continue;

      for (const row of stored) {
        const source = (row ?? {}) as Record<string, unknown>;
        for (const child of children) {
          const value = source[child.name];
          if (typeof value === "string" && value) ids.add(value);
        }
      }
    }
  }

  if (ids.size === 0) return new Map();

  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: [...ids] }, deletedAt: null },
    select: { id: true, storageKey: true, altText: true },
  });

  // Alt text lives on the asset rather than the section, so one description is
  // maintained in the library and every page that uses the image inherits it.
  return new Map(
    assets.map((asset) => [
      asset.id,
      { url: publicUrlForKey(asset.storageKey), alt: asset.altText ?? "" },
    ]),
  );
}

/** Collects every catalogue selection on the page so they load in one pass. */
function entityRequests(sections: StoredSection[]): EntityRequest[] {
  const requests: EntityRequest[] = [];

  for (const section of sections) {
    const definition = getSectionDefinition(section.type);
    if (!definition) continue;
    const content = (section.content ?? {}) as Record<string, unknown>;

    for (const field of definition.fields) {
      if (field.kind !== "entities") continue;
      const value = content[field.name];
      if (!Array.isArray(value)) continue;

      requests.push({
        kind: field.entity,
        ids: value.filter((id): id is string => typeof id === "string" && !!id),
        withDocuments: field.withDocuments ?? false,
      });
    }
  }

  return requests;
}

/**
 * The built forms a page's sections point at.
 *
 * Looked up once per page rather than once per section, because two sections
 * embedding the same form is a page that exists.
 */
async function resolveForms(
  sections: StoredSection[],
): Promise<Map<string, PublicForm>> {
  const keys = new Set<string>();
  for (const section of sections) {
    const definition = getSectionDefinition(section.type);
    if (!definition) continue;
    for (const field of definition.fields) {
      if (field.kind !== "formKey") continue;
      const value = (section.content as Record<string, unknown> | null)?.[
        field.name
      ];
      if (typeof value === "string" && value) keys.add(value);
    }
  }

  const resolved = new Map<string, PublicForm>();
  await Promise.all(
    [...keys].map(async (key) => {
      const form = await publicForm(key);
      if (form) resolved.set(key, form);
    }),
  );
  return resolved;
}

export async function RenderedSections({
  sections,
}: {
  sections: StoredSection[];
}) {
  const enabled = sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);

  const [mediaByIdMap, entityById, formsByKey] = await Promise.all([
    resolveMedia(enabled),
    resolveEntities(entityRequests(enabled)),
    resolveForms(enabled),
  ]);

  return (
    <>
      {enabled.map((section) => {
        const definition = getSectionDefinition(section.type);
        const Renderer = SECTION_RENDERERS[section.type];
        const schema = contentSchemaFor(section.type);

        // A section type that no longer exists, or content that fails its own
        // schema, is skipped rather than allowed to throw. One bad row should
        // not take down the page around it.
        if (!definition || !Renderer || !schema) return null;

        const parsed = schema.safeParse(section.content ?? {});
        if (!parsed.success) {
          console.error("Skipping section with invalid content", {
            sectionId: section.id,
            type: section.type,
            issues: parsed.error.issues.slice(0, 3),
          });
          return null;
        }

        const content = parsed.data as Record<string, unknown>;
        const design = normaliseDesign(section.design, section.anchorId);

        // Repeater rows look their own images up by id, so the whole page's
        // resolved assets travel with every section.
        const mediaById: Record<string, ResolvedMedia> =
          Object.fromEntries(mediaByIdMap);

        const media: Record<string, ResolvedMedia | null> = {};
        for (const field of definition.fields) {
          if (field.kind !== "media") continue;
          const value = content[field.name];
          media[field.name] =
            typeof value === "string" && value
              ? (mediaByIdMap.get(value) ?? null)
              : null;
        }

        // Kept in the order the editor arranged, with anything unpublished or
        // deleted simply absent rather than rendered as a gap.
        const entities: Record<string, ResolvedEntity[]> = {};
        for (const field of definition.fields) {
          if (field.kind !== "entities") continue;
          const ids = content[field.name];
          entities[field.name] = Array.isArray(ids)
            ? ids.flatMap((id) => {
                const found =
                  typeof id === "string"
                    ? entityById.get(entityKey(field.entity, id))
                    : undefined;
                return found ? [found] : [];
              })
            : [];
        }

        // A built form that has since been unpublished or deleted resolves to
        // nothing, and the section falls back to the enquiry form rather than
        // rendering a gap where a form used to be.
        const forms: Record<string, PublicForm | null> = {};
        for (const field of definition.fields) {
          if (field.kind !== "formKey") continue;
          const key = content[field.name];
          forms[field.name] =
            typeof key === "string" && key
              ? (formsByKey.get(key) ?? null)
              : null;
        }

        return (
          <Section
            key={section.id}
            spacing={design.spacing}
            container={design.container}
            background={design.background}
            anchorId={design.anchorId}
          >
            <Renderer
              forms={forms}
              content={content}
              design={design}
              media={media}
              mediaById={mediaById}
              entities={entities}
            />
          </Section>
        );
      })}
    </>
  );
}
