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
import { findSolution, solutionPath } from "@/server/solutions/service";
import { linkableCategories } from "@/server/categories/service";
import { deleteSolutionAction } from "@/server/solutions/actions";
import { SolutionForm } from "../solution-form";

export const metadata: Metadata = {
  title: "Edit solution",
  robots: { index: false, follow: false },
};

export default async function EditSolutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("SOLUTIONS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const [solution, categories, mediaOptions] = await Promise.all([
    findSolution(id),
    linkableCategories(),
    pickableMedia(),
  ]);
  if (!solution) notFound();

  const path = solutionPath(solution.slug);

  return (
    <AdminPage>
      <AdminPageHeader
        title={solution.name}
        description={path}
        backHref="/admin/solutions"
        backLabel="Back to solutions"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={solution.status} />
            {solution.status === "PUBLISHED" ? (
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
            {can("SOLUTIONS", "DELETE") ? (
              <form action={deleteSolutionAction}>
                <input type="hidden" name="solutionId" value={solution.id} />
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
          <SolutionForm
            mode="edit"
            version={solution.updatedAt.toISOString()}
            categories={categories}
            mediaOptions={mediaOptions}
            canPublish={can("SOLUTIONS", "PUBLISH")}
            readOnly={!can("SOLUTIONS", "EDIT")}
            values={{
              id: solution.id,
              name: solution.name,
              slug: solution.slug,
              shortDescription: solution.shortDescription ?? "",
              description: solution.description ?? "",
              imageId: solution.imageId ?? "",
              bannerId: solution.bannerId ?? "",
              featured: solution.featured,
              status: solution.status,
              categoryIds: solution.categories.map(
                (link: { categoryId: string }) => link.categoryId,
              ),
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
