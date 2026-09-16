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
import { cn } from "@/lib/utils/cn";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import {
  findProduct,
  productPath,
  productTaxonomies,
} from "@/server/products/service";
import {
  applicationChoices,
  pickableDocuments,
  productDocuments,
  productApplicationLinks,
  productInfoCounts,
  productPoints,
  productRelated,
  productSpecs,
  relatableProducts,
  specTemplateFor,
} from "@/server/products/info-service";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/server/products/actions";
import {
  applySpecTemplateAction,
  saveProductApplicationsAction,
  saveProductDocumentsAction,
  saveProductPointsAction,
  saveProductRelatedAction,
  saveProductSpecsAction,
} from "@/server/products/info-actions";
import { ProductForm } from "../product-form";
import { SpecEditor } from "./spec-editor";
import { DocumentEditor } from "./document-editor";
import { ApplicationsEditor } from "./applications-editor";
import { RelatedEditor } from "./related-editor";
import { FaqEditor } from "@/components/admin/faq-editor";
import { PointsEditor } from "./points-editor";
import { saveFaqsAction } from "@/server/faqs/actions";
import { entityFaqs, faqSignature } from "@/server/faqs/service";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

const TABS = [
  { key: "details", label: "Details" },
  { key: "points", label: "Highlights" },
  { key: "specs", label: "Specifications" },
  { key: "documents", label: "Documents" },
  { key: "applications", label: "Applications" },
  { key: "related", label: "Related" },
  { key: "faqs", label: "Questions" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("PRODUCTS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const query = await searchParams;
  const requested = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab: TabKey = TABS.some((entry) => entry.key === requested)
    ? (requested as TabKey)
    : "details";

  const [product, counts] = await Promise.all([
    findProduct(id),
    productInfoCounts(id),
  ]);
  if (!product) notFound();

  const path = productPath(product.slug);
  const readOnly = !can("PRODUCTS", "EDIT");

  return (
    <AdminPage>
      <AdminPageHeader
        title={product.name}
        description={`${product.category.name} · ${path}`}
        backHref="/admin/products"
        backLabel="Back to products"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={product.status} />
            {product.status === "PUBLISHED" ? (
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
            {can("PRODUCTS", "DELETE") ? (
              <form action={deleteProductAction}>
                <input type="hidden" name="productId" value={product.id} />
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

      {/* Links rather than client-side tabs: each panel is its own form with
          its own save, so switching is a navigation, and the browser's own
          warning about leaving a page is the right one to get. */}
      <nav aria-label="Product sections" className="border-line border-b">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((entry) => {
            const count =
              entry.key === "details"
                ? null
                : counts[entry.key as keyof typeof counts];
            const active = entry.key === tab;

            return (
              <li key={entry.key}>
                <Link
                  href={`/admin/products/${product.id}?tab=${entry.key}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-body-sm flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors",
                    active
                      ? "border-primary text-ink"
                      : "text-ink-muted hover:text-ink border-transparent",
                  )}
                >
                  {entry.label}
                  {count ? (
                    <span className="bg-surface-muted text-caption text-ink-muted rounded-full px-1.5 py-0.5">
                      {count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "details" ? <DetailsPanel id={id} /> : null}
      {tab === "points" ? (
        <PointsPanel productId={product.id} readOnly={readOnly} />
      ) : null}
      {tab === "specs" ? (
        <SpecsPanel
          productId={product.id}
          categoryId={product.categoryId}
          readOnly={readOnly}
        />
      ) : null}
      {tab === "documents" ? (
        <DocumentsPanel productId={product.id} readOnly={readOnly} />
      ) : null}
      {tab === "applications" ? (
        <ApplicationsPanel productId={product.id} readOnly={readOnly} />
      ) : null}
      {tab === "related" ? (
        <RelatedPanel productId={product.id} readOnly={readOnly} />
      ) : null}
      {tab === "faqs" ? (
        <FaqsPanel productId={product.id} readOnly={readOnly} />
      ) : null}
    </AdminPage>
  );
}

/* -------------------------------------------------------------------------
 * Panels
 *
 * Each loads only what it shows. A product with thirty specifications, twenty
 * documents and a dozen related products should not pay for all of them to
 * render the one panel someone opened.
 * ---------------------------------------------------------------------- */

async function PointsPanel({
  productId,
  readOnly,
}: {
  productId: string;
  readOnly: boolean;
}) {
  const points = await productPoints(productId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Highlights and features</CardTitle>
      </CardHeader>
      <CardContent>
        <PointsEditor
          productId={productId}
          highlights={points.highlights}
          features={points.features}
          version={points.signature}
          saveAction={saveProductPointsAction}
          readOnly={readOnly}
        />
      </CardContent>
    </Card>
  );
}

async function DetailsPanel({ id }: { id: string }) {
  const { can } = await currentPermissions();
  const [product, taxonomies, mediaOptions] = await Promise.all([
    findProduct(id),
    productTaxonomies(),
    pickableMedia(),
  ]);
  if (!product) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <ProductForm
          mode="edit"
          version={product.updatedAt.toISOString()}
          createAction={createProductAction}
          updateAction={updateProductAction}
          categories={taxonomies.categories}
          brands={taxonomies.brands}
          specialties={taxonomies.specialties}
          solutions={taxonomies.solutions}
          mediaOptions={mediaOptions}
          canPublish={can("PRODUCTS", "PUBLISH")}
          readOnly={!can("PRODUCTS", "EDIT")}
          values={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            modelNumber: product.modelNumber ?? "",
            shortDescription: product.shortDescription ?? "",
            description: product.description ?? "",
            categoryId: product.categoryId,
            brandId: product.brandId ?? "",
            primaryImageId: product.primaryImageId ?? "",
            galleryIds: product.images.map(
              (image: { mediaId: string }) => image.mediaId,
            ),
            specialtyIds: product.specialties.map(
              (link: { specialtyId: string }) => link.specialtyId,
            ),
            solutionIds: product.solutions.map(
              (link: { solutionId: string }) => link.solutionId,
            ),
            featured: product.featured,
            status: product.status,
          }}
        />
      </CardContent>
    </Card>
  );
}

async function SpecsPanel({
  productId,
  categoryId,
  readOnly,
}: {
  productId: string;
  categoryId: string;
  readOnly: boolean;
}) {
  const [groups, template] = await Promise.all([
    productSpecs(productId),
    specTemplateFor(categoryId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Specifications</CardTitle>
      </CardHeader>
      <CardContent>
        <SpecEditor
          productId={productId}
          readOnly={readOnly}
          saveAction={saveProductSpecsAction}
          applyAction={applySpecTemplateAction}
          templateName={template?.name ?? null}
          version={groups
            .map(
              (group) =>
                `${group.id}(${group.items.map((i) => i.id).join(",")})`,
            )
            .join("|")}
          groups={groups.map((group) => ({
            label: group.label,
            items: group.items.map((item) => ({
              label: item.label,
              value: item.value,
              unit: item.unit ?? "",
            })),
          }))}
        />
      </CardContent>
    </Card>
  );
}

async function DocumentsPanel({
  productId,
  readOnly,
}: {
  productId: string;
  readOnly: boolean;
}) {
  const [documents, options] = await Promise.all([
    productDocuments(productId),
    pickableDocuments(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <DocumentEditor
          productId={productId}
          readOnly={readOnly}
          options={options}
          saveAction={saveProductDocumentsAction}
          version={documents.map((row) => row.id).join("|")}
          documents={documents.map((row) => ({
            mediaId: row.mediaId,
            title: row.title,
            kind: row.kind,
            gated: row.gated,
          }))}
        />
      </CardContent>
    </Card>
  );
}

async function ApplicationsPanel({
  productId,
  readOnly,
}: {
  productId: string;
  readOnly: boolean;
}) {
  const [choices, links] = await Promise.all([
    applicationChoices(),
    productApplicationLinks(productId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
      </CardHeader>
      <CardContent>
        <ApplicationsEditor
          productId={productId}
          readOnly={readOnly}
          choices={choices}
          saveAction={saveProductApplicationsAction}
          version={links.join("|") || "none"}
          selected={links}
        />
      </CardContent>
    </Card>
  );
}

async function RelatedPanel({
  productId,
  readOnly,
}: {
  productId: string;
  readOnly: boolean;
}) {
  const [related, choices] = await Promise.all([
    productRelated(productId),
    relatableProducts(productId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related products</CardTitle>
      </CardHeader>
      <CardContent>
        <RelatedEditor
          productId={productId}
          readOnly={readOnly}
          choices={choices}
          saveAction={saveProductRelatedAction}
          version={related.map((row) => row.id).join("|") || "none"}
          related={related.map((row) => row.id)}
        />
      </CardContent>
    </Card>
  );
}

async function FaqsPanel({
  productId,
  readOnly,
}: {
  productId: string;
  readOnly: boolean;
}) {
  const faqs = await entityFaqs("Product", productId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questions</CardTitle>
      </CardHeader>
      <CardContent>
        <FaqEditor
          entityType="Product"
          entityId={productId}
          readOnly={readOnly}
          saveAction={saveFaqsAction}
          version={faqSignature(faqs)}
          faqs={faqs.map((row) => ({
            question: row.question,
            answer: row.answer,
          }))}
        />
      </CardContent>
    </Card>
  );
}
