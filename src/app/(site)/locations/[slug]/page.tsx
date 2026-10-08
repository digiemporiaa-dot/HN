import type { Metadata } from "next";
import Link from "next/link";

import { CheckCircle2 } from "lucide-react";

import {
  Accordion,
  buttonStyles,
  Container,
  Section,
  SectionHeader,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { EnquiryDialog, EnquiryForm } from "@/components/site/enquiry-form";
import { MetaChip, PageHero } from "@/components/site/page-hero";
import { PageCta } from "@/components/site/page-cta";
import {
  ArrowLink,
  CategoryCard,
  fitColumns,
  SceneCard,
} from "@/components/site/cards";
import { sceneVisual } from "@/lib/visuals";
import { RichText } from "@/cms/rich-text";
import { RenderedSections } from "@/cms/render-page";
import {
  cityHeadline,
  publicCity,
  publishedCitySlugs,
  type PublicCity,
} from "@/server/locations/public";
import { entityFaqs } from "@/server/faqs/service";
import { submitEnquiryAction } from "@/server/leads/actions";
import { withSeoOverride } from "@/server/seo/overrides";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageJsonLd } from "@/server/seo/structured-data";
import { missingPage } from "@/server/seo/missing";
import { canPreview } from "@/server/preview";

type RouteParams = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await publishedCitySlugs();
  return slugs.map((slug) => ({ slug }));
}

/** What the page says about itself when its editor has not said otherwise. */
function fallbackDescription(city: PublicCity): string {
  return (
    city.intro?.trim() ||
    `Medical and surgical equipment for hospitals and clinics in ${city.name}, ${city.state.name}: supply, installation and service, quoted to requirement.`
  );
}

async function pageMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const city = await publicCity(slug);
  if (!city) return { title: "Location not found" };

  const title = city.seoTitle?.trim() || cityHeadline(city);
  const description = city.seoDescription?.trim() || fallbackDescription(city);

  // Indexed only when it is both published and switched on. A published page
  // with nothing specific to the city on it is a doorway page to a search
  // engine, and the switch is how an editor says this one is not.
  const indexed = city.status === "PUBLISHED" && city.indexable;

  return {
    title,
    description,
    alternates: { canonical: city.path },
    openGraph: {
      title,
      description,
      type: "website",
      images: city.heroImage ? [{ url: city.heroImage.url }] : undefined,
    },
    // Spread rather than set to undefined, so an indexed page inherits the
    // site-wide robots setting instead of replacing it.
    ...(indexed ? {} : { robots: { index: false, follow: true } }),
  };
}

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(route: RouteParams): Promise<Metadata> {
  const base = await pageMetadata(route);
  const { slug } = await route.params;
  return withSeoOverride(`/locations/${slug}`, base);
}

export default async function CityPage({ params }: RouteParams) {
  const { slug } = await params;
  const city = await publicCity(slug);
  if (!city) return missingPage(`/locations/${slug}`);

  const published = city.status === "PUBLISHED";
  // The same 404 for a draft as for a slug that does not exist, so unpublished
  // cities cannot be discovered by guessing.
  if (!published && !(await canPreview("LOCATIONS"))) {
    return missingPage(`/locations/${slug}`);
  }

  const faqs = await entityFaqs("City", city.id);
  const image = city.heroImage ?? sceneVisual(`${city.name} hospital`);

  const enquiry = (label: string, variant: "primary" | "inverse" = "primary") => (
    // The city travels with the enquiry, so the lead records which city page
    // produced it — the number a city page is judged by.
    <EnquiryDialog
      action={submitEnquiryAction}
      cityId={city.id}
      triggerLabel={label}
      triggerClassName={buttonStyles({ variant, size: "lg" })}
      title={`Request a quotation — ${city.name}`}
      description="Tell us the department, the equipment and the timeline. We reply within one working day."
      submitLabel="Send enquiry"
    />
  );

  return (
    <>
      {published ? null : (
        <div className="bg-warning-50 border-warning-100 border-b">
          <Container className="text-body-sm text-warning-700 flex flex-wrap items-center justify-between gap-3 py-3">
            <span>
              Preview — this city page is {city.status.toLowerCase()} and is not
              visible to the public.
            </span>
            <Link
              href={`/admin/locations/cities/${city.id}`}
              className="underline underline-offset-4"
            >
              Edit city
            </Link>
          </Container>
        </div>
      )}

      <PageHero
        variant="image"
        image={image}
        trail={[
          { label: "Home", href: "/" },
          { label: "Locations", href: "/locations" },
          { label: city.name },
        ]}
        eyebrow={`${city.name}, ${city.state.name}`}
        title={cityHeadline(city)}
        description={city.intro}
        meta={
          <>
            {city.categories.length > 0 ? <MetaChip dark>{city.categories.length} equipment categories</MetaChip> : null}
            <MetaChip dark>Supply, installation & support</MetaChip>
          </>
        }
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            {enquiry(city.ctaLabel?.trim() || "Request a quotation")}
            <Link href="#enquire" className={buttonStyles({ variant: "outline-inverse", size: "lg" })}>
              Send an enquiry
            </Link>
          </div>
        }
      />

      {published ? <JsonLd data={faqPageJsonLd(faqs)} /> : null}

      {city.content ? (
        <Section spacing="large" container="wide">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <span className="eyebrow">Overview</span>
              <h2 className="text-h1 text-ink">Medical equipment for {city.name}.</h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <RichText value={city.content} className="prose-hn max-w-[68ch]" />
            </div>
          </div>
        </Section>
      ) : null}

      {city.categories.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl">
          <SectionHeader
            overline="Equipment categories"
            title={`What hospitals in ${city.name} ask us for.`}
            action={<ArrowLink href="/categories">All categories</ArrowLink>}
          />
          <ul className={`reveal-stagger mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6 ${fitColumns(city.categories.length).replace("sm:grid-cols-2 ", "")}`}>
            {city.categories.map((category) => (
              <li key={category.id}>
                <CategoryCard
                  size="compact"
                  data={{ name: category.name, href: category.href, summary: category.summary, image: category.image, count: category.productCount }}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {city.products.length > 0 ? (
        <Section spacing="large" container="wide">
          <SectionHeader
            overline="Featured equipment"
            title={`Regularly quoted in ${city.name}.`}
            action={<ArrowLink href="/products">All products</ArrowLink>}
          />
          <ul className={`reveal-stagger mt-12 grid grid-cols-1 gap-5 lg:gap-6 ${fitColumns(city.products.length)}`}>
            {city.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        </Section>
      ) : null}

      {city.specialties.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl">
          <SectionHeader overline="Specialties" title={`Departments we equip in and around ${city.name}.`} />
          <ul className={`reveal-stagger mt-12 grid grid-cols-1 gap-5 lg:gap-6 ${fitColumns(city.specialties.length, 3)}`}>
            {city.specialties.map((specialty) => (
              <li key={specialty.id}>
                <SceneCard
                  kind="specialty"
                  data={{ name: specialty.name, href: specialty.href, summary: specialty.summary, image: specialty.image }}
                  aspect="landscape"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {city.coverage ? (
        <Section spacing="large" container="wide">
          <div className="surface-gradient border-line grid gap-8 rounded-3xl border p-8 sm:p-12 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-4 lg:col-span-4">
              <span className="eyebrow">Local support</span>
              <h2 className="text-h2 text-ink">Serving {city.name}.</h2>
              <p className="text-body-sm text-ink-muted">What supply, installation and service here involves.</p>
            </div>
            <div className="lg:col-span-8">
              <RichText value={city.coverage} className="prose-hn" />
            </div>
          </div>
        </Section>
      ) : null}

      {/* Sections an editor has built for this city, in their own order and
          with their own backgrounds, after the parts every city page has. */}
      <RenderedSections sections={city.sections} />

      {faqs.length > 0 ? (
        <Section spacing="large" container="wide" background="pearl">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <span className="eyebrow">FAQ</span>
              <h2 className="text-h1 text-ink">Common questions.</h2>
            </div>
            <div className="lg:col-span-8">
              <Accordion
                items={faqs.map((faq) => ({
                  id: faq.id,
                  question: faq.question,
                  answer: <RichText value={faq.answer} />,
                }))}
              />
            </div>
          </div>
        </Section>
      ) : null}

      <Section spacing="large" container="wide" anchorId="enquire">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <span className="eyebrow">Enquire</span>
            <h2 className="text-section text-ink">
              {city.ctaHeading?.trim() || `Equipping a facility in ${city.name}?`}
            </h2>
            <p className="text-lead text-ink-muted">
              {city.ctaBody?.trim() ||
                "Tell us the department, the equipment and the timeline. Everything is quoted to requirement, and we reply within one working day."}
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Single products or complete department packages",
                "Delivery and installation coordinated locally",
                "One consolidated quotation for your list",
              ].map((line) => (
                <li key={line} className="text-body-sm text-ink flex items-start gap-3">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-teal-500" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-line bg-surface rounded-3xl border p-6 shadow-[var(--shadow-card)] sm:p-10 lg:col-span-7">
            <EnquiryForm action={submitEnquiryAction} cityId={city.id} submitLabel="Send enquiry" />
          </div>
        </div>
      </Section>

      <PageCta
        background="pearl"
        title={`Talk to our team about ${city.name}.`}
        body="From a single device to a complete hospital, we prepare quotations to your requirement."
        image={image}
        actions={
          <>
            {enquiry(city.ctaLabel?.trim() || "Request a quotation")}
            <Link href="/locations" className={buttonStyles({ variant: "outline-inverse", size: "lg" })}>
              Other locations
            </Link>
          </>
        }
      />
    </>
  );
}
