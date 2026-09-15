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
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { findSpecialty, specialtyPath } from "@/server/specialties/service";
import { linkableCategories } from "@/server/categories/service";
import { deleteSpecialtyAction } from "@/server/specialties/actions";
import { SpecialtyForm } from "../specialty-form";

export const metadata: Metadata = {
  title: "Edit specialty",
  robots: { index: false, follow: false },
};

export default async function EditSpecialtyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("SPECIALTIES", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const [specialty, categories, mediaOptions] = await Promise.all([
    findSpecialty(id),
    linkableCategories(),
    pickableMedia(),
  ]);
  if (!specialty) notFound();

  const path = specialtyPath(specialty.slug);

  return (
    <AdminPage>
      <AdminPageHeader
        title={specialty.name}
        description={path}
        backHref="/admin/specialties"
        backLabel="Back to specialties"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={specialty.status} />
            {specialty.status === "PUBLISHED" ? (
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
            {can("SPECIALTIES", "DELETE") ? (
              <form action={deleteSpecialtyAction}>
                <input type="hidden" name="specialtyId" value={specialty.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SpecialtyForm
            mode="edit"
            version={specialty.updatedAt.toISOString()}
            categories={categories}
            mediaOptions={mediaOptions}
            canPublish={can("SPECIALTIES", "PUBLISH")}
            readOnly={!can("SPECIALTIES", "EDIT")}
            values={{
              id: specialty.id,
              name: specialty.name,
              slug: specialty.slug,
              shortDescription: specialty.shortDescription ?? "",
              description: specialty.description ?? "",
              imageId: specialty.imageId ?? "",
              bannerId: specialty.bannerId ?? "",
              featured: specialty.featured,
              status: specialty.status,
              categoryIds: specialty.categories.map(
                (link: { categoryId: string }) => link.categoryId,
              ),
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
