import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { catalogueChoices } from "@/server/cms/catalogue-choices";
import { embeddableForms } from "@/server/forms/service";
import { publicUrlForKey } from "@/server/storage/paths";
import { deletePageAction } from "@/server/cms/actions";
import {
  contentSchemaFor,
  getSectionDefinition,
  SECTION_DEFINITIONS,
} from "@/cms/sections/definitions";
import { DEFAULT_SECTION_DESIGN } from "@/lib/design/section-options";
import { AddSectionForm, PageSettingsForm } from "./page-forms";
import { SectionEditor, type EditableSection } from "./section-editor";
import type { MediaOption } from "./field-inputs";

export const metadata: Metadata = {
  title: "Edit page",
  robots: { index: false, follow: false },
};

/** Files an editor can place in a section. Documents are excluded: no current
 *  section renders one, and offering them would only produce broken images. */
const PICKABLE_KINDS = ["IMAGE", "VECTOR"] as const;

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("PAGES", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;

  const page = await prisma.page.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      updatedAt: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          order: true,
          enabled: true,
          anchorId: true,
          content: true,
          design: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!page) notFound();

  const [catalogue, forms] = await Promise.all([
    catalogueChoices(),
    embeddableForms(),
  ]);

  const assets = await prisma.mediaAsset.findMany({
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
  });

  const mediaOptions: MediaOption[] = assets.map((asset) => ({
    id: asset.id,
    url: publicUrlForKey(asset.storageKey),
    name: asset.title || asset.originalName,
    isImage: asset.kind === "IMAGE" || asset.kind === "VECTOR",
  }));

  const canEdit = can("PAGES", "EDIT");

  const sections: EditableSection[] = page.sections.flatMap((section) => {
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
    <AdminPage>
      <AdminPageHeader
        title={page.title}
        description={`/${page.slug}`}
        backHref="/admin/pages"
        backLabel="Back to pages"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={page.status} />
            {page.status === "PUBLISHED" ? (
              <Link
                href={`/${page.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                View page
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
            {can("PAGES", "DELETE") ? (
              <form action={deletePageAction}>
                <input type="hidden" name="pageId" value={page.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2
                    aria-hidden="true"
                    className="text-danger-600 size-4"
                  />
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Page settings</CardTitle>
        </CardHeader>
        <CardContent>
          <PageSettingsForm
            pageId={page.id}
            title={page.title}
            slug={page.slug}
            status={page.status}
            canPublish={can("PAGES", "PUBLISH")}
            readOnly={!canEdit}
            version={page.updatedAt.toISOString()}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-h4 text-ink">Sections</h2>

        {sections.length === 0 ? (
          <EmptyState
            title="No sections yet"
            description="A page is built from sections stacked top to bottom. Add the first one below."
          />
        ) : (
          <ol className="flex flex-col gap-3">
            {sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                mediaOptions={mediaOptions}
                catalogue={catalogue}
                forms={forms}
                isFirst={index === 0}
                isLast={index === sections.length - 1}
                readOnly={!canEdit}
              />
            ))}
          </ol>
        )}

        {canEdit ? (
          <AddSectionForm
            pageId={page.id}
            options={SECTION_DEFINITIONS.map((definition) => ({
              value: definition.type,
              label: definition.label,
              description: definition.description,
            }))}
          />
        ) : null}
      </section>
    </AdminPage>
  );
}
