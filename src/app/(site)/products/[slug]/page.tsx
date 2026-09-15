import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Mail, MessageCircle, Phone } from "lucide-react";

import {
  Accordion,
  Breadcrumb,
  buttonStyles,
  Container,
  Section,
  SectionHeader,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product-gallery";
import { RichText } from "@/cms/rich-text";
import { visitorHasPermission } from "@/server/permissions";
import { getSiteSettings } from "@/server/settings/service";
import { brandPath } from "@/server/brands/service";
import { categoryPath } from "@/server/categories/service";
import { specialtyPath } from "@/server/specialties/service";
import { solutionPath } from "@/server/solutions/service";
import {
  publicProduct,
  publishedProductSlugs,
  type PublicProduct,
} from "@/server/products/public";
import { productPath } from "@/server/products/service";

type RouteParams = { params: Promise<{ slug: string }> };

const DOCUMENT_LABELS: Record<string, string> = {
  BROCHURE: "Brochure",
  DATASHEET: "Datasheet",
  MANUAL: "User manual",
  CERTIFICATE: "Certificate",
  CASE_STUDY: "Case study",
  OTHER: "Document",
};

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export async function generateStaticParams() {
  const slugs = await publishedProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) return { title: "Product not found" };

  const description =
    product.shortDescription ??
    `${product.name} — ${product.category.name} supplied and installed by us.`;

  return {
    title: product.modelNumber
      ? `${product.name} (${product.modelNumber})`
      : product.name,
    description,
    alternates: { canonical: productPath(product.slug) },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.gallery[0]
        ? [{ url: product.gallery[0].url }]
        : undefined,
    },
    // A draft must never be indexed, even while a signed-in editor previews it.
    robots:
      product.status === "PUBLISHED"
        ? undefined
        : { index: false, follow: false },
  };
}

export default async function ProductPage({ params }: RouteParams) {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) notFound();

  const published = product.status === "PUBLISHED";
  // The same response as a slug that does not exist, so an unpublished URL
  // cannot be probed for.
  if (!published && !(await visitorHasPermission("PRODUCTS", "VIEW")))
    notFound();

  const settings = await getSiteSettings();
  const parent = product.category.parent;

  const trail = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    ...(parent && parent.status === "PUBLISHED"
      ? [{ label: parent.name, href: categoryPath(parent.slug) }]
      : []),
    ...(product.category.status === "PUBLISHED"
      ? [
          {
            label: product.category.name,
            href: categoryPath(product.category.slug, parent?.slug),
          },
        ]
      : []),
    { label: product.name },
  ];

  return (
    <>
      {published ? null : (
        <PreviewBanner id={product.id} status={product.status} />
      )}

      <Container className="pt-6">
        <Breadcrumb items={trail} />
      </Container>

      <Section spacing="normal" container="standard">
        <div className="grid gap-10 lg:grid-cols-2">
          <ProductGallery images={product.gallery} name={product.name} />

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              {/* An unpublished brand is not named at all, here or on a card:
                  draft means not visible publicly, and a name on someone
                  else's page is still visible. */}
              {product.brand && product.brand.status === "PUBLISHED" ? (
                <Link
                  href={brandPath(product.brand.slug)}
                  className="text-caption text-primary font-medium uppercase tracking-wide"
                >
                  {product.brand.name}
                </Link>
              ) : null}

              <h1 className="text-h1 text-ink">{product.name}</h1>

              {product.modelNumber ? (
                <p className="text-body-sm text-ink-muted">
                  Model {product.modelNumber}
                </p>
              ) : null}
            </div>

            {product.shortDescription ? (
              <p className="text-body-lg text-ink-muted">
                {product.shortDescription}
              </p>
            ) : null}

            <EnquiryPanel product={product} settings={settings} />

            <TaxonomyLinks product={product} />
          </div>
        </div>
      </Section>

      {product.description ? (
        <Section spacing="normal" container="standard" background="light">
          <SectionHeader title="About this product" align="left" />
          <div className="prose-hn mt-6 max-w-[70ch]">
            <RichText value={product.description} />
          </div>
        </Section>
      ) : null}

      {product.specGroups.length > 0 ? (
        <Section
          spacing="normal"
          container="standard"
          anchorId="specifications"
        >
          <SectionHeader title="Specifications" align="left" />

          <div className="mt-8 flex flex-col gap-8">
            {product.specGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-3">
                <h3 className="text-h4 text-ink">{group.label}</h3>
                <div className="border-line overflow-x-auto rounded-lg border">
                  <table className="w-full text-left">
                    <tbody className="divide-line divide-y">
                      {group.items.map((item) => (
                        <tr key={item.id}>
                          <th
                            scope="row"
                            className="text-body-sm text-ink-muted w-1/3 px-4 py-3 font-normal"
                          >
                            {item.label}
                          </th>
                          <td className="text-body-sm text-ink px-4 py-3">
                            {item.value || "—"}
                            {item.value && item.unit ? (
                              <span className="text-ink-muted">
                                {" "}
                                {item.unit}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {product.documents.length > 0 ? (
        <Section spacing="normal" container="standard" background="light">
          <SectionHeader title="Documents" align="left" />
          <ul className="mt-6 flex max-w-[70ch] flex-col gap-2">
            {product.documents.map((document) => (
              <li key={document.id}>
                <a
                  href={document.href}
                  target="_blank"
                  rel="noreferrer"
                  className="border-line bg-surface hover:border-line-strong flex items-center gap-3 rounded-md border p-4 transition-colors"
                >
                  <Download
                    aria-hidden="true"
                    className="text-primary size-5 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-body-sm text-ink block font-medium">
                      {document.title}
                    </span>
                    <span className="text-caption text-ink-subtle block">
                      {DOCUMENT_LABELS[document.kind] ?? "Document"} ·{" "}
                      {fileSize(document.sizeBytes)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {product.faqs.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader title="Questions" align="left" />
          <div className="mt-6 max-w-[70ch]">
            <Accordion
              items={product.faqs.map((faq) => ({
                id: faq.id,
                question: faq.question,
                answer: <RichText value={faq.answer} />,
              }))}
            />
          </div>
        </Section>
      ) : null}

      {product.related.length > 0 ? (
        <Section spacing="normal" container="standard" background="light">
          <SectionHeader title="Related products" align="left" />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {product.related.map((row) => (
              <ProductCard
                key={row.id}
                product={{
                  id: row.id,
                  name: row.name,
                  slug: row.slug,
                  modelNumber: row.modelNumber,
                  shortDescription: row.shortDescription,
                  categoryName: row.categoryName,
                  brandName: null,
                  image: row.image,
                }}
              />
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

function PreviewBanner({ id, status }: { id: string; status: string }) {
  return (
    <div className="bg-warning-50 border-warning-100 border-b">
      <Container className="text-body-sm text-warning-700 flex flex-wrap items-center justify-between gap-3 py-3">
        <span>
          Preview — this product is {status.toLowerCase()} and is not visible to
          the public.
        </span>
        <Link
          href={`/admin/products/${id}`}
          className="underline underline-offset-4"
        >
          Edit product
        </Link>
      </Container>
    </div>
  );
}

/**
 * How to ask about this product.
 *
 * A quotation form belongs to the RFQ module, which is not built yet, so this
 * uses the contact details an administrator has actually entered — and shows
 * nothing at all rather than a dead button if none have been.
 */
function EnquiryPanel({
  product,
  settings,
}: {
  product: PublicProduct;
  settings: {
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };
}) {
  const reference = product.modelNumber
    ? `${product.name} (${product.modelNumber})`
    : product.name;

  const mailto = settings.email
    ? `mailto:${settings.email}?subject=${encodeURIComponent(`Quotation request: ${reference}`)}`
    : null;
  const whatsapp = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`I would like a quotation for ${reference}.`)}`
    : null;

  if (!mailto && !settings.phone && !whatsapp) return null;

  return (
    <div className="border-line bg-surface-muted flex flex-col gap-3 rounded-lg border p-5">
      <p className="text-body-sm text-ink">
        This product is quoted to your requirement — configuration, accessories
        and installation all affect the price.
      </p>

      <div className="flex flex-wrap gap-3">
        {mailto ? (
          <a href={mailto} className={buttonStyles({ size: "lg" })}>
            <Mail aria-hidden="true" className="size-4" />
            Request a quotation
          </a>
        ) : null}
        {settings.phone ? (
          <a
            href={`tel:${settings.phone.replace(/\s+/g, "")}`}
            className={buttonStyles({ variant: "outline", size: "lg" })}
          >
            <Phone aria-hidden="true" className="size-4" />
            {settings.phone}
          </a>
        ) : null}
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles({ variant: "outline", size: "lg" })}
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}

function TaxonomyLinks({ product }: { product: PublicProduct }) {
  const groups = [
    {
      label: "Used by",
      items: product.specialties.map((row) => ({
        name: row.name,
        href: specialtyPath(row.slug),
      })),
    },
    {
      label: "Part of",
      items: product.solutions.map((row) => ({
        name: row.name,
        href: solutionPath(row.slug),
      })),
    },
    {
      label: "Applications",
      items: product.applications.map((row) => ({
        name: row.name,
        href: `/applications/${row.slug}`,
      })),
    },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <dl className="border-line flex flex-col gap-3 border-t pt-5">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-wrap items-baseline gap-2">
          <dt className="text-caption text-ink-subtle w-24 shrink-0">
            {group.label}
          </dt>
          <dd className="flex flex-wrap gap-x-3 gap-y-1">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-body-sm text-primary underline underline-offset-4"
              >
                {item.name}
              </Link>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
