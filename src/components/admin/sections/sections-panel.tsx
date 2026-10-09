import { EmptyState } from "@/components/ui";
import { prisma } from "@/server/db";
import { catalogueChoices } from "@/server/cms/catalogue-choices";
import { embeddableForms } from "@/server/forms/service";
import { ctaConfigChoices } from "@/server/cta/service";
import { publicUrlForKey } from "@/server/storage/paths";
import type { OwnerRef } from "@/server/cms/section-owner";
import {
  contentSchemaFor,
  getSectionDefinition,
  SECTION_DEFINITIONS,
} from "@/cms/sections/definitions";
import { DEFAULT_SECTION_DESIGN } from "@/lib/design/section-options";
import { AddSectionForm } from "./add-section-form";
import { SectionEditor, type EditableSection } from "./section-editor";
import type { MediaOption } from "./field-inputs";

/** Files an editor can place in a section. Documents are excluded: no current
 *  section renders one, and offering them would only produce broken images. */
const PICKABLE_KINDS = ["IMAGE", "VECTOR"] as const;

/** A stored section, as the panel needs it. */
export type StoredSectionRow = {
  id: string;
  type: string;
  order: number;
  enabled: boolean;
  anchorId: string | null;
  content: unknown;
  design: unknown;
  updatedAt: Date;
};

/**
 * The stack of sections on a page or a city, and the control to add one.
 *
 * One component for every owner, so a section is edited the same way wherever
 * it lives and there is one place to fix it. What differs between owners — who
 * may edit, where it renders — is decided on the server by the section
 * actions, from the owner recorded in the database.
 */
export async function SectionsPanel({
  owner,
  sections: rows,
  canEdit,
  emptyDescription,
}: {
  owner: OwnerRef;
  sections: StoredSectionRow[];
  canEdit: boolean;
  emptyDescription: string;
}) {
  const [catalogue, forms, ctaConfigs, assets] = await Promise.all([
    catalogueChoices(),
    embeddableForms(),
    ctaConfigChoices(),
    prisma.mediaAsset.findMany({
      where: { deletedAt: null, kind: { in: [...PICKABLE_KINDS] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        storageKey: true,
        originalName: true,
        title: true,
        kind: true,
      },
    }),
  ]);

  const mediaOptions: MediaOption[] = assets.map((asset) => ({
    id: asset.id,
    url: publicUrlForKey(asset.storageKey),
    name: asset.title || asset.originalName,
    isImage: asset.kind === "IMAGE" || asset.kind === "VECTOR",
  }));

  const sections: EditableSection[] = rows.flatMap((section) => {
    const definition = getSectionDefinition(section.type);
    if (!definition) return [];

    const storedDesign = (section.design ?? {}) as Record<string, unknown>;
    const design: Record<string, string> = {};
    for (const [key, value] of Object.entries({
      ...DEFAULT_SECTION_DESIGN,
      ...definition.design,
      ...storedDesign,
    })) {
      if (typeof value === "string") design[key] = value;
    }

    // The public renderer skips a section whose content fails its own schema.
    // Without this flag that section would simply not appear, with nothing in
    // the editor to say why.
    const schema = contentSchemaFor(section.type);
    const complete = schema
      ? schema.safeParse(section.content ?? {}).success
      : false;

    return [
      {
        id: section.id,
        type: section.type,
        complete,
        version: section.updatedAt.toISOString(),
        label: definition.label,
        description: definition.description,
        order: section.order,
        enabled: section.enabled,
        anchorId: section.anchorId ?? "",
        content: (section.content ?? {}) as Record<string, unknown>,
        design,
        fields: definition.fields,
        designOptions: definition.designOptions,
      },
    ];
  });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h4 text-ink">Sections</h2>

      {sections.length === 0 ? (
        <EmptyState title="No sections yet" description={emptyDescription} />
      ) : (
        <ol className="flex flex-col gap-3">
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              mediaOptions={mediaOptions}
              catalogue={catalogue}
              forms={forms}
              ctaConfigs={ctaConfigs}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
              readOnly={!canEdit}
            />
          ))}
        </ol>
      )}

      {canEdit ? (
        <AddSectionForm
          owner={owner}
          options={SECTION_DEFINITIONS.map((definition) => ({
            value: definition.type,
            label: definition.label,
            description: definition.description,
          }))}
        />
      ) : null}
    </section>
  );
}
