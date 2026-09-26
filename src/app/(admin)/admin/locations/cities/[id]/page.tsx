import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FaqEditor } from "@/components/admin/faq-editor";
import { SectionsPanel } from "@/components/admin/sections/sections-panel";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { catalogueChoices } from "@/server/cms/catalogue-choices";
import { activeStates, cityPath, findCity } from "@/server/locations/service";
import { deleteCityAction } from "@/server/locations/actions";
import { saveFaqsAction } from "@/server/faqs/actions";
import { entityFaqs, faqSignature } from "@/server/faqs/service";
import { CityForm } from "./city-form";
import { CityLinks } from "./city-links";

export const metadata: Metadata = {
  title: "Edit city",
  robots: { index: false, follow: false },
};

export default async function EditCityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("LOCATIONS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const city = await findCity(id);
  if (!city) notFound();

  const [states, mediaOptions, catalogue, faqs] = await Promise.all([
    activeStates(),
    pickableMedia(),
    catalogueChoices(),
    entityFaqs("City", city.id),
  ]);

  // A city filed under a state since made inactive keeps that state in its own
  // picker, so saving the city does not silently move it somewhere else.
  const stateOptions = states.some((state) => state.id === city.stateId)
    ? states
    : [
        {
          id: city.state.id,
          name: `${city.state.name} (inactive)`,
          kind: "STATE" as const,
        },
        ...states,
      ];

  const canEdit = can("LOCATIONS", "EDIT");
  const path = cityPath(city.slug);

  // Links are one save, so they share one version: any change to any list
  // resyncs the editor.
  const linksVersion = [
    ...city.categories.map((row) => row.categoryId),
    "|",
    ...city.products.map((row) => row.productId),
    "|",
    ...city.specialties.map((row) => row.specialtyId),
  ].join(":");

  return (
    <AdminPage>
      <AdminPageHeader
        title={city.name}
        description={`${city.state.name} · ${path}`}
        backHref="/admin/locations"
        backLabel="Back to locations"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={city.status} />
            {city.indexable ? (
              <Badge tone="info">Indexed</Badge>
            ) : (
              <Badge tone="neutral">Not indexed</Badge>
            )}
            {city.status === "PUBLISHED" ? (
              <Link
                href={path}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                View page
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
            {can("LOCATIONS", "DELETE") ? (
              <form action={deleteCityAction}>
                <input type="hidden" name="cityId" value={city.id} />
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
          <CardTitle>Page</CardTitle>
        </CardHeader>
        <CardContent>
          <CityForm
            version={city.updatedAt.toISOString()}
            states={stateOptions}
            mediaOptions={mediaOptions}
            canPublish={can("LOCATIONS", "PUBLISH")}
            readOnly={!canEdit}
            values={{
              id: city.id,
              stateId: city.stateId,
              name: city.name,
              slug: city.slug,
              headline: city.headline ?? "",
              heroImageId: city.heroImageId ?? "",
              intro: city.intro ?? "",
              content: city.content ?? "",
              coverage: city.coverage ?? "",
              ctaHeading: city.ctaHeading ?? "",
              ctaBody: city.ctaBody ?? "",
              ctaLabel: city.ctaLabel ?? "",
              seoTitle: city.seoTitle ?? "",
              seoDescription: city.seoDescription ?? "",
              indexable: city.indexable,
              status: city.status,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Featured on this page</CardTitle>
        </CardHeader>
        <CardContent>
          <CityLinks
            cityId={city.id}
            version={linksVersion}
            readOnly={!canEdit}
            choices={{
              // Subcategories are ranges in their own right and a city page
              // may feature either level.
              categories: [...catalogue.category, ...catalogue.subcategory],
              products: catalogue.product,
              specialties: catalogue.specialty,
            }}
            values={{
              categoryIds: city.categories.map((row) => row.categoryId),
              productIds: city.products.map((row) => row.productId),
              specialtyIds: city.specialties.map((row) => row.specialtyId),
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <FaqEditor
            entityType="City"
            entityId={city.id}
            readOnly={!canEdit}
            saveAction={saveFaqsAction}
            version={faqSignature(faqs)}
            faqs={faqs.map((row) => ({
              question: row.question,
              answer: row.answer,
            }))}
          />
        </CardContent>
      </Card>

      <SectionsPanel
        owner={{ kind: "city", id: city.id }}
        sections={city.sections}
        canEdit={canEdit}
        emptyDescription="Optional — for anything the fields above do not cover, built from the same sections as any other page."
      />
    </AdminPage>
  );
}
