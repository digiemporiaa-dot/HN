import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ExternalLink, FolderPlus, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
  buttonStyles,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import {
  categoryPath,
  findCategory,
  MAX_CATEGORY_DEPTH,
} from "@/server/categories/service";
import {
  deleteCategoryAction,
  moveCategoryAction,
} from "@/server/categories/actions";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = {
  title: "Edit category",
  robots: { index: false, follow: false },
};

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("CATEGORIES", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const { error } = await searchParams;

  const [category, mediaOptions] = await Promise.all([
    findCategory(id),
    pickableMedia(),
  ]);
  if (!category) notFound();

  const canEdit = can("CATEGORIES", "EDIT");
  const isTopLevel = category.depth === 0;
  const path = categoryPath(category.slug, category.parent?.slug);

  return (
    <AdminPage>
      <AdminPageHeader
        title={category.name}
        description={path}
        backHref={isTopLevel ? "/admin/categories" : "/admin/subcategories"}
        backLabel={isTopLevel ? "Back to categories" : "Back to subcategories"}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={category.status} />
            {category.status === "PUBLISHED" ? (
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
            {can("CATEGORIES", "DELETE") ? (
              <form action={deleteCategoryAction}>
                <input type="hidden" name="categoryId" value={category.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      {error === "has-children" ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            This category still has subcategories. Move or delete them first —
            deleting it would take the whole branch, and its URLs, with it.
          </span>
        </div>
      ) : null}

      {category.parent ? (
        <p className="text-body-sm text-ink-muted">
          Subcategory of{" "}
          <Link
            href={`/admin/categories/${category.parent.id}`}
            className="text-primary underline underline-offset-4"
          >
            {category.parent.name}
          </Link>
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            mode="edit"
            parents={[]}
            mediaOptions={mediaOptions}
            canPublish={can("CATEGORIES", "PUBLISH")}
            readOnly={!canEdit}
            version={category.updatedAt.toISOString()}
            values={{
              id: category.id,
              name: category.name,
              slug: category.slug,
              shortDescription: category.shortDescription ?? "",
              description: category.description ?? "",
              imageId: category.imageId ?? "",
              bannerId: category.bannerId ?? "",
              featured: category.featured,
              status: category.status,
              parentId: category.parentId ?? "",
              parentSlug: category.parent?.slug ?? null,
            }}
          />
        </CardContent>
      </Card>

      {category.depth < MAX_CATEGORY_DEPTH ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h4 text-ink">Subcategories</h2>
            {can("CATEGORIES", "CREATE") ? (
              <Link
                href={`/admin/categories/new?parent=${category.id}`}
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                <FolderPlus aria-hidden="true" className="size-4" />
                Add subcategory
              </Link>
            ) : null}
          </div>

          {category.children.length === 0 ? (
            <EmptyState
              title="No subcategories"
              description="This category stands on its own. Add subcategories when the range is large enough to split."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {category.children.map((child, index) => (
                <li
                  key={child.id}
                  className="border-line bg-surface flex flex-wrap items-center gap-3 rounded-lg border p-4"
                >
                  <Link
                    href={`/admin/categories/${child.id}`}
                    className="text-body-sm text-ink hover:text-primary min-w-0 flex-1 font-medium transition-colors"
                  >
                    {child.name}
                    <span className="text-caption text-ink-muted ml-2">
                      /{child.slug}
                    </span>
                  </Link>

                  <StatusBadge status={child.status} />

                  {canEdit ? (
                    <div className="flex items-center gap-0.5">
                      <form action={moveCategoryAction}>
                        <input type="hidden" name="categoryId" value={child.id} />
                        <input type="hidden" name="direction" value="up" />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          aria-label={`Move ${child.name} up`}
                        >
                          <span aria-hidden="true">↑</span>
                        </Button>
                      </form>
                      <form action={moveCategoryAction}>
                        <input type="hidden" name="categoryId" value={child.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          disabled={index === category.children.length - 1}
                          aria-label={`Move ${child.name} down`}
                        >
                          <span aria-hidden="true">↓</span>
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </AdminPage>
  );
}
