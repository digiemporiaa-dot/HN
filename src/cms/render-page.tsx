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
import { SECTION_RENDERERS } from "./sections/renderers";

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
    spacing: pick(source.spacing, SECTION_SPACING, DEFAULT_SECTION_DESIGN.spacing),
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
    columns: pick(source.columns, SECTION_COLUMNS, DEFAULT_SECTION_DESIGN.columns!),
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
      if (field.kind !== "media") continue;
      const value = content[field.name];
      if (typeof value === "string" && value) ids.add(value);
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

export async function RenderedSections({
  sections,
}: {
  sections: StoredSection[];
}) {
  const enabled = sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);

  const mediaById = await resolveMedia(enabled);

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

        const media: Record<string, ResolvedMedia | null> = {};
        for (const field of definition.fields) {
          if (field.kind !== "media") continue;
          const value = content[field.name];
          media[field.name] =
            typeof value === "string" && value
              ? (mediaById.get(value) ?? null)
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
            <Renderer content={content} design={design} media={media} />
          </Section>
        );
      })}
    </>
  );
}
