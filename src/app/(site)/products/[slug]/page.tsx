import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Download,
  FileText,
  Lock,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

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
import { SectionNav } from "@/components/site/section-nav";
import { PageCta } from "@/components/site/page-cta";
import { ArrowLink, SceneCard } from "@/components/site/cards";
import { RichText } from "@/cms/rich-text";
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
import { faqPageJsonLd, productJsonLd } from "@/server/seo/structured-data";
import { EnquiryDialog } from "@/components/site/enquiry-form";
import { AddToQuoteButton } from "@/components/site/quote-basket";
import { StickyQuoteBar } from "@/components/site/sticky-quote-bar";
import { submitEnquiryAction } from "@/server/leads/actions";
import { withSeoOverride } from "@/server/seo/overrides";
import { missingPage } from "@/server/seo/missing";
import { canPreview } from "@/server/preview";

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

async function pageMetadata({ params }: RouteParams): Promise<Metadata> {
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

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(route: RouteParams): Promise<Metadata> {
  const base = await pageMetadata(route);
  const { slug } = await route.params;
  return withSeoOverride(`/products/${slug}`, base);
}

export default async function ProductPage({ params }: RouteParams) {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) return missingPage(`/products/${slug}`);

  const published = product.status === "PUBLISHED";
  // The same response as a slug that does not exist, so an unpublished URL
  // cannot be probed for.
  if (!published && !(await canPreview("PRODUCTS")))
    return missingPage(`/products/${slug}`);

  const settings = await getSiteSettings();
  const parent = product.category.parent;
  const categoryHref = categoryPath(product.category.slug, parent?.slug);
  const categoryLive = product.category.status === "PUBLISHED";
  const brandLive = product.brand?.status === "PUBLISHED" ? product.brand : null;

  const trail = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    ...(parent && parent.status === "PUBLISHED"
      ? [{ label: parent.name, href: categoryPath(parent.slug) }]
      : []),
    ...(categoryLive ? [{ label: product.category.name, href: categoryHref }] : []),
    { label: product.name },
  ];

  const brochure = product.documents.find((document) => document.href);
  const highlights = product.highlights.slice(0, 6);

  const sections = [
    { id: "overview", label: "Overview", show: Boolean(product.description) || highlights.length > 0 },
    { id: "features", label: "Key features", show: product.features.length > 0 },
    { id: "specifications", label: "Specifications", show: product.specGroups.length > 0 },
    { id: "applications", label: "Applications", show: product.applications.length > 0 },
    { id: "documents", label: "Documents", show: product.documents.length > 0 },
    { id: "faq", label: "FAQ", show: product.faqs.length > 0 },
  ].filter((section) => section.show);

  const quoteDialog = (size: "sm" | "lg", label = "Request a quotation") => (
    <EnquiryDialog
      action={submitEnquiryAction}
      productId={product.id}
      triggerLabel={label}
      triggerClassName={buttonStyles({ size })}
      title={`Request a quotation — ${reference(product)}`}
      description="Tell us the department, quantity and configuration. We reply within one working day."
      submitLabel="Send enquiry"
    />
  );

  return (
    <>
      {published ? null : <PreviewBanner id={product.id} status={product.status} />}

      <section className="bg-canvas relative">
        <Container width="wide" className="pt-6">
          <Breadcrumb items={trail} />
        </Container>
        <Container width="wide" className="grid gap-10 pt-8 pb-16 lg:grid-cols-[1.3fr_0.9fr] lg:gap-16 lg:pb-24">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <ProductGallery images={product.gallery} name={product.name} />
          </div>

          <div className="flex min-w-0 flex-col gap-7">
            <div className="flex flex-col gap-4">
              <div className="eyebrow flex flex-wrap items-center gap-x-2">
                {categoryLive ? (
                  <Link href={categoryHref} className="hover:text-primary transition-colors">
                    {product.category.name}
                  </Link>
                ) : null}
                {categoryLive && brandLive ? <span aria-hidden="true">·</span> : null}
                {/* An unpublished brand is not named at all: draft means not
                    visible publicly, and a name on someone else's page is
                    still visible. */}
                {brandLive ? (
                  <Link href={brandPath(brandLive.slug)} className="hover:text-primary transition-colors">
                    {brandLive.name}
                  </Link>
                ) : null}
              </div>

              <h1 className="font-display text-ink text-safe text-[clamp(2.25rem,1.5rem+2.6vw,3.75rem)] leading-[1.05] font-normal tracking-[-0.035em]">
                {product.name}
              </h1>

              {product.modelNumber ? (
                <p className="text-body-sm text-ink-muted">
                  Model <span className="text-ink font-medium">{product.modelNumber}</span>
                </p>
              ) : null}

              {product.shortDescription ? (
                <p className="text-body-lg text-ink-muted max-w-[48ch]">{product.shortDescription}</p>
              ) : null}
            </div>

            {highlights.length > 0 ? (
              <ul className="border-line grid border-t sm:grid-cols-2 sm:gap-x-8">
                {highlights.map((point) => (
                  <li key={point.id} className="border-line text-body-sm text-ink flex items-start gap-3 border-b py-3">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cyan-600" />
                    {point.title}
                  </li>
                ))}
              </ul>
            ) : null}

            <EnquiryPanel
              id="enquiry-panel"
              product={product}
              settings={settings}
              quote={quoteDialog("lg")}
              brochureHref={brochure?.href ?? null}
            />

            <TaxonomyLinks product={product} />
          </div>
        </Container>
      </section>

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
            brandName: brandLive ? brandLive.name : null,
            categoryName: product.category.name,
          })}
        />
      ) : null}
      {published ? <JsonLd data={faqPageJsonLd(product.faqs)} /> : null}

      <SectionNav items={sections.map(({ id, label }) => ({ id, label }))} label="Product sections" />

      {product.description || highlights.length > 0 ? (
        <Section spacing="large" container="wide" anchorId="overview">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <span className="eyebrow">Overview</span>
              <h2 className="text-section text-ink">Product overview.</h2>
              {product.description ? (
                <RichText value={product.description} className="prose-hn max-w-[68ch]" />
              ) : null}
            </div>
            <aside className="lg:col-span-4 lg:col-start-9">
              <div className="sticky top-[calc(var(--header-h)+5rem)] flex flex-col gap-5">
                <p className="eyebrow">At a glance</p>
                <dl className="divide-line border-ink/80 flex flex-col divide-y border-t">
                  {[
                    ["Category", product.category.name],
                    ["Brand", brandLive?.name ?? null],
                    ["Model", product.modelNumber],
                    ["Pricing", "Quoted to requirement"],
                    ["Documents", product.documents.length > 0 ? `${product.documents.length} available` : null],
                  ]
                    .filter((row): row is [string, string] => Boolean(row[1]))
                    .map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="text-body-sm text-ink-muted">{label}</dt>
                        <dd className="text-body-sm text-ink text-right font-medium">{value}</dd>
                      </div>
                    ))}
                </dl>
                {quoteDialog("lg")}
              </div>
            </aside>
          </div>
        </Section>
      ) : null}

      {product.features.length > 0 ? (
        <Section spacing="large" container="wide" anchorId="features">
          <SectionHeader
            overline="Key features"
            title="Designed for daily clinical use."
            description="What the equipment does, and what that means in a working department."
          />
          <ol className="reveal-stagger mt-12">
            {product.features.map((point, index) => (
              <li key={point.id} className="border-ink/15 grid gap-3 border-t py-7 last:border-b sm:grid-cols-[6rem_minmax(0,1fr)] lg:grid-cols-[8rem_minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
                <span className="font-display text-ink-subtle text-[2rem] leading-none font-light tracking-[-0.04em] tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-h3 text-ink">{point.title}</h3>
                {point.body ? <p className="text-body text-ink-muted sm:col-start-2 lg:col-start-auto">{point.body}</p> : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {product.specGroups.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl" anchorId="specifications">
          <SectionHeader
            overline="Specifications"
            title="Technical specifications."
            description="Typical values for the standard configuration. Your quotation confirms the exact specification."
          />
          <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
            {product.specGroups.map((group) => (
              <div key={group.id} className="reveal">
                <h3 className="border-ink/80 text-ink border-b pb-3 text-[0.75rem] font-semibold tracking-[0.1em] uppercase">
                  {group.label}
                </h3>
                {/* A definition list rather than a table, stacked until there
                    is room for two columns: a label is a phrase, and a third
                    of a phone is not enough for one. */}
                <dl className="divide-line divide-y">
                  {group.items.map((item) => (
                    <div key={item.id} className="grid gap-1 px-3 py-3.5 odd:bg-surface-subtle sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
                      <dt className="text-body-sm text-ink-muted">{item.label}</dt>
                      <dd className="text-body-sm text-ink text-safe font-medium">
                        {item.value || "—"}
                        {item.value && item.unit ? <span className="text-ink-muted font-normal"> {item.unit}</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {product.applications.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl" anchorId="applications">
          <SectionHeader
            overline="Applications"
            title="Where it is used."
            description="Clinical environments this equipment is supplied for."
          />
          <ul className="reveal-stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {product.applications.map((row) => (
              <li key={row.slug}>
                <SceneCard
                  kind="application"
                  data={{ name: row.name, href: `/applications/${row.slug}`, summary: row.description, image: row.image }}
                  aspect="landscape"
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {product.documents.length > 0 ? (
        <Section spacing="large" container="wide" anchorId="documents">
          <SectionHeader overline="Documents" title="Brochures and datasheets." size="compact" />
          <ul className="mt-10 grid gap-x-12 md:grid-cols-2">
            {product.documents.map((document) => (
              <li
                key={document.id}
                className="border-line flex flex-wrap items-center gap-4 border-t py-5"
              >
                <span className="bg-surface-panel text-ink flex size-11 shrink-0 items-center justify-center rounded-lg">
                  {document.gated ? <Lock aria-hidden="true" className="size-5" /> : <FileText aria-hidden="true" className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-body-sm text-ink block font-semibold">{document.title}</span>
                  <span className="text-caption text-ink-subtle block">
                    {DOCUMENT_LABELS[document.kind] ?? "Document"} · {fileSize(document.sizeBytes)}
                    {document.gated ? " · sent after a short enquiry" : ""}
                  </span>
                </span>
                {document.href ? (
                  <a href={document.href} target="_blank" rel="noreferrer" className={buttonStyles({ variant: "outline", size: "sm" })}>
                    <Download aria-hidden="true" className="size-4" />
                    Download
                  </a>
                ) : (
                  <EnquiryDialog
                    action={submitEnquiryAction}
                    productId={product.id}
                    documentId={document.id}
                    triggerLabel="Request document"
                    triggerClassName={buttonStyles({ variant: "outline", size: "sm" })}
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

      {product.faqs.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl" anchorId="faq">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <span className="eyebrow">FAQ</span>
              <h2 className="text-h1 text-ink">Common questions.</h2>
              <p className="text-body text-ink-muted">About quoting, installation and requesting several products together.</p>
              <ArrowLink href="/contact" className="w-fit">
                Ask a different question
              </ArrowLink>
            </div>
            <div className="lg:col-span-8">
              <Accordion
                items={product.faqs.map((faq) => ({
                  id: faq.id,
                  question: faq.question,
                  answer: <RichText value={faq.answer} />,
                }))}
              />
            </div>
          </div>
        </Section>
      ) : null}

      {product.related.length > 0 ? (
        <Section spacing="large" container="wide">
          <SectionHeader
            overline="Related equipment"
            title="Often specified together."
            action={<ArrowLink href={categoryLive ? categoryHref : "/products"}>Browse the range</ArrowLink>}
          />
          <ul className="reveal-stagger mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
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

      <PageCta
        eyebrow="Request a quotation"
        title={`Planning to procure the ${product.name}?`}
        body="Tell us the department, the configuration and the timeline. Everything is quoted to your requirement, and we reply within one working day."
        background={product.related.length > 0 ? "pearl" : "default"}
        actions={
          <>
            {quoteDialog("lg")}
            <AddToQuoteButton productId={product.id} productName={product.name} size="lg" variant="outline-inverse" />
          </>
        }
      />

      {/* Follows the reader down a page that is long by design. It shows only
          once the panel at the top has scrolled away, so it never competes
          with the control it stands in for. */}
      <StickyQuoteBar watchId="enquiry-panel">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <p className="text-body-sm text-ink truncate font-semibold">{product.name}</p>
            <p className="text-caption text-ink-muted hidden sm:block">Quoted to your requirement</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AddToQuoteButton productId={product.id} productName={product.name} size="sm" compact className="hidden sm:inline-flex" />
          {quoteDialog("sm", "Request quote")}
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
 * The quotation form is always here, because it is ours rather than a mail
 * client's; email, phone and WhatsApp appear only if an administrator has
 * entered the details behind them — a dead mailto is worse than no button.
 */
function EnquiryPanel({
  id,
  product,
  settings,
  quote,
  brochureHref,
}: {
  id?: string;
  product: PublicProduct;
  settings: {
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };
  quote: React.ReactNode;
  brochureHref: string | null;
}) {
  const name = reference(product);

  const mailto = settings.email
    ? `mailto:${settings.email}?subject=${encodeURIComponent(`Quotation request: ${name}`)}`
    : null;
  const whatsapp = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`I would like a quotation for ${name}.`)}`
    : null;

  const contacts = [
    mailto ? { href: mailto, icon: Mail, label: "Email us", external: false } : null,
    settings.phone ? { href: `tel:${settings.phone.replace(/[^\d+]/g, "")}`, icon: Phone, label: settings.phone, external: false } : null,
    whatsapp ? { href: whatsapp, icon: MessageCircle, label: "WhatsApp", external: true } : null,
  ].filter((row): row is { href: string; icon: typeof Mail; label: string; external: boolean } => row !== null);

  return (
    <div id={id} className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-500" />
        <p className="text-body-sm text-ink-muted">
          <span className="text-ink font-semibold">Quoted to your requirement.</span>{" "}
          Configuration, accessories and installation scope all shape the quotation.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {quote}
        {/* For the tender that covers a list rather than one machine: adding
            builds it up across the catalogue and sends it in one request. */}
        <AddToQuoteButton productId={product.id} productName={product.name} size="lg" />
      </div>

      {brochureHref || contacts.length > 0 ? (
        <div className="border-line flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4">
          {brochureHref ? (
            <a href={brochureHref} target="_blank" rel="noreferrer" className="text-body-sm text-primary inline-flex items-center gap-2 font-semibold">
              <Download aria-hidden="true" className="size-4" />
              Download brochure
            </a>
          ) : null}
          {contacts.map((contact) => {
            const Icon = contact.icon;
            return (
              <a
                key={contact.href}
                href={contact.href}
                {...(contact.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="text-body-sm text-ink-muted hover:text-ink inline-flex items-center gap-2 transition-colors"
              >
                <Icon aria-hidden="true" className="size-4" />
                {contact.label}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TaxonomyLinks({ product }: { product: PublicProduct }) {
  const groups = [
    {
      label: "Used in",
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
    <dl className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
          <dt className="text-caption text-ink-subtle w-20 shrink-0 font-semibold tracking-[0.12em] uppercase">
            {group.label}
          </dt>
          <dd className="text-body-sm text-ink flex flex-wrap gap-x-1.5 gap-y-1">
            {group.items.map((item, index) => (
              <span key={item.href}>
                <Link href={item.href} className="hover:text-primary underline decoration-[var(--color-line-strong)] underline-offset-4 transition-colors">
                  {item.name}
                </Link>
                {index < group.items.length - 1 ? <span className="text-ink-subtle">,</span> : null}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

