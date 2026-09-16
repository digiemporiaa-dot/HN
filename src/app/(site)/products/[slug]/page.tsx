import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Download, Mail, MessageCircle, Phone } from "lucide-react";

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
import { JsonLd } from "@/components/seo/json-ld";
import { productJsonLd } from "@/server/seo/structured-data";
import { EnquiryDialog } from "@/components/site/enquiry-form";
import { AddToQuoteButton } from "@/components/site/quote-basket";
import { StickyQuoteBar } from "@/components/site/sticky-quote-bar";
import { submitEnquiryAction } from "@/server/leads/actions";

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
    // Spread rather than set to undefined: an explicitly present `robots` key
    // replaces the one inherited from the root layout, which would quietly
    // defeat the site-wide staging opt-out on every published page.
    ...(product.status === "PUBLISHED"
      ? {}
      : { robots: { index: false, follow: false } }),
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

      {/* Only published products are described to search engines: a draft is
          noindex anyway, and structured data for a page nobody may see would
          be an assertion about something that does not exist yet. */}
      {published ? (
        <JsonLd
          data={productJsonLd({
            name: product.name,
            path: productPath(product.slug),
            description: product.shortDescription,
            modelNumber: product.modelNumber,
            images: product.gallery.map((image) => image.url),
            brandName:
              product.brand?.status === "PUBLISHED" ? product.brand.name : null,
            categoryName: product.category.name,
          })}
        />
      ) : null}

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

            <EnquiryPanel
              id="enquiry-panel"
              product={product}
              settings={settings}
            />

            <TaxonomyLinks product={product} />
          </div>
        </div>
      </Section>

      {product.highlights.length > 0 ? (
        <Section spacing="compact" container="standard" background="light">
          {/* No heading. These are the four or five things a buyer should see
              on the way past, and a heading over them would only slow that
              down — the section below is where the explaining happens. */}
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.highlights.map((point) => (
              <li key={point.id} className="flex items-start gap-3">
                <Check
                  aria-hidden="true"
                  className="text-primary mt-0.5 size-5 shrink-0"
                />
                <span className="text-body text-ink">{point.title}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {product.description ? (
        <Section spacing="normal" container="standard">
          <SectionHeader title="About this product" align="left" />
          <div className="prose-hn mt-6 max-w-[70ch]">
            <RichText value={product.description} />
          </div>
        </Section>
      ) : null}

      {product.features.length > 0 ? (
        <Section spacing="normal" container="standard" background="light">
          <SectionHeader
            title="Features"
            description="What the equipment does, and what that means in a working department."
            align="left"
          />
          <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {product.features.map((point) => (
              <li key={point.id} className="flex flex-col gap-1.5">
                <h3 className="text-body text-ink font-medium">
                  {point.title}
                </h3>
                {point.body ? (
                  <p className="text-body-sm text-ink-muted">{point.body}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {product.applications.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader
            title="Where it is used"
            description="Procedures and departments this equipment is supplied for."
            align="left"
          />
          <ul className="mt-8 flex flex-wrap gap-3">
            {product.applications.map((row) => (
              <li key={row.slug}>
                <Link
                  href={`/applications/${row.slug}`}
                  className="border-line bg-surface hover:border-line-strong text-body-sm text-ink inline-flex rounded-full border px-4 py-2 transition-colors"
                >
                  {row.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {product.specGroups.length > 0 ? (
        <Section
          spacing="normal"
          container="standard"
          background="light"
          anchorId="specifications"
        >
          <SectionHeader title="Specifications" align="left" />

          <div className="mt-8 flex flex-col gap-8">
            {product.specGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-3">
                <h3 className="text-h4 text-ink">{group.label}</h3>
                {/* A definition list rather than a table, and stacked until
                    there is room for two columns. A specification label is a
                    phrase — "Central illuminance" — and a third of a phone is
                    not enough for one, so on a narrow screen the value goes
                    underneath rather than the label breaking across four
                    lines. */}
                <dl className="border-line bg-surface divide-line divide-y rounded-lg border">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4"
                    >
                      <dt className="text-body-sm text-ink-muted sm:w-2/5 sm:shrink-0">
                        {item.label}
                      </dt>
                      <dd className="text-body-sm text-ink">
                        {item.value || "—"}
                        {item.value && item.unit ? (
                          <span className="text-ink-muted"> {item.unit}</span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {product.documents.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader title="Documents" align="left" />
          <ul className="mt-6 flex max-w-[70ch] flex-col gap-2">
            {product.documents.map((document) => (
              <li
                key={document.id}
                className="border-line bg-surface flex flex-wrap items-center gap-3 rounded-md border p-4"
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
                    {document.gated ? " · sent after a short enquiry" : ""}
                  </span>
                </span>

                {document.href ? (
                  <a
                    href={document.href}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonStyles({ variant: "outline", size: "sm" })}
                  >
                    Download
                  </a>
                ) : (
                  <EnquiryDialog
                    action={submitEnquiryAction}
                    productId={product.id}
                    documentId={document.id}
                    triggerLabel="Request this document"
                    triggerClassName={buttonStyles({
                      variant: "outline",
                      size: "sm",
                    })}
                    title={document.title}
                    description="Tell us who you are and we will send it straight over."
                    submitLabel="Send and download"
                  />
                )}
              </li>
            ))}
          </ul>
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

      <Section spacing="large" container="standard" background="dark">
        <div className="flex flex-col items-start gap-6">
          <SectionHeader
            title={`Ask us about the ${product.name}`}
            description="Tell us the department, the configuration and the timeline. We reply within one working day."
            align="left"
          />
          <div className="flex flex-wrap gap-3">
            <EnquiryDialog
              action={submitEnquiryAction}
              productId={product.id}
              triggerLabel="Request a quotation"
              triggerClassName={buttonStyles({ size: "lg" })}
              title={`Request a quotation — ${reference(product)}`}
              description="We reply within one working day."
              submitLabel="Send enquiry"
            />
            <AddToQuoteButton productId={product.id} size="lg" />
          </div>
        </div>
      </Section>

      {/* Follows the reader down a page that is long by design. It shows only
          once the panel at the top has scrolled away, so it never competes
          with the control it stands in for. */}
      <StickyQuoteBar watchId="enquiry-panel">
        <div className="min-w-0 flex-1">
          <p className="text-body-sm text-ink truncate font-medium">
            {product.name}
          </p>
          <p className="text-caption text-ink-muted hidden sm:block">
            Quoted to your requirement
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AddToQuoteButton
            productId={product.id}
            size="sm"
            className="hidden sm:inline-flex"
          />
          <EnquiryDialog
            action={submitEnquiryAction}
            productId={product.id}
            triggerLabel="Request a quotation"
            triggerClassName={buttonStyles({ size: "sm" })}
            title={`Request a quotation — ${reference(product)}`}
            description="We reply within one working day."
            submitLabel="Send enquiry"
          />
        </div>
      </StickyQuoteBar>
    </>
  );
}

/** How a product is named back to someone asking about it. */
function reference(product: PublicProduct): string {
  return product.modelNumber
    ? `${product.name} (${product.modelNumber})`
    : product.name;
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
 * Four ways of asking, and the last three appear only if an administrator has
 * entered the details behind them: a dead mailto is worse than no button. The
 * quotation form is always here, because it is ours rather than a mail client's.
 */
function EnquiryPanel({
  id,
  product,
  settings,
}: {
  id?: string;
  product: PublicProduct;
  settings: {
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };
}) {
  const name = reference(product);

  const mailto = settings.email
    ? `mailto:${settings.email}?subject=${encodeURIComponent(`Quotation request: ${name}`)}`
    : null;
  const whatsapp = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`I would like a quotation for ${name}.`)}`
    : null;

  return (
    <div
      id={id}
      className="border-line bg-surface-muted flex flex-col gap-3 rounded-lg border p-5"
    >
      <p className="text-body-sm text-ink">
        This product is quoted to your requirement — configuration, accessories
        and installation all affect the price.
      </p>

      <div className="flex flex-wrap gap-3">
        <EnquiryDialog
          action={submitEnquiryAction}
          productId={product.id}
          triggerLabel="Request a quotation"
          triggerClassName={buttonStyles({ size: "lg" })}
          title={`Request a quotation — ${name}`}
          description="We reply within one working day."
          submitLabel="Send enquiry"
        />
        {/* For the tender that covers a list rather than one machine: adding
            builds it up across the catalogue and sends it in one request. */}
        <AddToQuoteButton productId={product.id} size="lg" />
        {mailto ? (
          <a
            href={mailto}
            className={buttonStyles({ variant: "outline", size: "lg" })}
          >
            <Mail aria-hidden="true" className="size-4" />
            Email us
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
    // Applications are deliberately absent: they have a section of their own
    // further down the page, and the same list twice is a list nobody reads.
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
