import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Accordion,
  Breadcrumb,
  buttonStyles,
  Container,
  Section,
  SectionHeader,
} from "@/components/ui";
import { ProductCard } from "@/components/site/product-card";
import { EnquiryDialog } from "@/components/site/enquiry-form";
import { RichText } from "@/cms/rich-text";
import { RenderedSections } from "@/cms/render-page";
import { visitorHasPermission } from "@/server/permissions";
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

type RouteParams = { params: Promise<{ slug: string }> };

/* eslint-disable @next/next/no-img-element -- media is served from our own
   route at its stored size. */

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
  if (!city) notFound();

  const published = city.status === "PUBLISHED";
  // The same 404 for a draft as for a slug that does not exist, so unpublished
  // cities cannot be discovered by guessing.
  if (!published && !(await visitorHasPermission("LOCATIONS", "VIEW"))) {
    notFound();
  }

  const faqs = await entityFaqs("City", city.id);

  // Alternating backgrounds are worked out from what is actually on the page,
  // so two light bands never sit next to each other when a section is empty.
  const blocks = [
    city.content ? "content" : null,
    city.categories.length > 0 ? "categories" : null,
    city.products.length > 0 ? "products" : null,
    city.specialties.length > 0 ? "specialties" : null,
    city.coverage ? "coverage" : null,
  ].filter((block): block is string => block !== null);
  const background = (block: string) =>
    blocks.indexOf(block) % 2 === 1 ? ("light" as const) : ("default" as const);

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

      {published ? <JsonLd data={faqPageJsonLd(faqs)} /> : null}

      <CityHero city={city} />

      {city.content ? (
        <Section
          spacing="normal"
          container="standard"
          background={background("content")}
        >
          <div className="prose-hn max-w-[70ch]">
            <RichText value={city.content} />
          </div>
        </Section>
      ) : null}

      {city.categories.length > 0 ? (
        <Section
          spacing="normal"
          container="standard"
          background={background("categories")}
        >
          <SectionHeader
            title={`Equipment we supply in ${city.name}`}
            description="The ranges hospitals here most often ask us about."
            align="left"
          />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {city.categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={category.href}
                  className="border-line bg-surface hover:border-line-strong group flex h-full gap-4 rounded-lg border p-5 transition-colors"
                >
                  {category.image ? (
                    <img
                      src={category.image.url}
                      alt={category.image.alt}
                      loading="lazy"
                      className="bg-surface-muted size-16 shrink-0 rounded-md object-contain p-1.5"
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-body text-ink group-hover:text-primary font-medium transition-colors">
                      {category.name}
                    </span>
                    {category.summary ? (
                      <span className="text-body-sm text-ink-muted line-clamp-2">
                        {category.summary}
                      </span>
                    ) : null}
                    <span className="text-caption text-ink-subtle">
                      {category.productCount} product
                      {category.productCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {city.products.length > 0 ? (
        <Section
          spacing="normal"
          container="standard"
          background={background("products")}
        >
          <SectionHeader
            title="Featured equipment"
            description={`Products we are regularly asked to quote for in ${city.name}.`}
            align="left"
          />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {city.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        </Section>
      ) : null}

      {city.specialties.length > 0 ? (
        <Section
          spacing="normal"
          container="standard"
          background={background("specialties")}
        >
          <SectionHeader
            title="Departments we equip"
            description={`Specialties we supply to in and around ${city.name}.`}
            align="left"
          />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {city.specialties.map((specialty) => (
              <li key={specialty.id}>
                <Link
                  href={specialty.href}
                  className="border-line bg-surface hover:border-line-strong group flex h-full gap-4 rounded-lg border p-5 transition-colors"
                >
                  {specialty.image ? (
                    <img
                      src={specialty.image.url}
                      alt={specialty.image.alt}
                      loading="lazy"
                      className="bg-surface-muted size-14 shrink-0 rounded-md object-contain p-1.5"
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-body text-ink group-hover:text-primary font-medium transition-colors">
                      {specialty.name}
                    </span>
                    {specialty.summary ? (
                      <span className="text-body-sm text-ink-muted line-clamp-2">
                        {specialty.summary}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {city.coverage ? (
        <Section
          spacing="normal"
          container="standard"
          background={background("coverage")}
        >
          <SectionHeader
            title={`Serving ${city.name}`}
            description="What supply, installation and service here involves."
            align="left"
          />
          <div className="prose-hn mt-6 max-w-[70ch]">
            <RichText value={city.coverage} />
          </div>
        </Section>
      ) : null}

      {/* Sections an editor has built for this city, in their own order and
          with their own backgrounds, after the parts every city page has. */}
      <RenderedSections sections={city.sections} />

      {faqs.length > 0 ? (
        <Section spacing="normal" container="standard">
          <SectionHeader title="Common questions" align="left" />
          <div className="mt-6 max-w-[70ch]">
            <Accordion
              items={faqs.map((faq) => ({
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
            title={
              city.ctaHeading?.trim() || `Equipping a facility in ${city.name}?`
            }
            description={
              city.ctaBody?.trim() ||
              "Tell us the department, the equipment and the timeline. Everything is quoted to requirement, and we reply within one working day."
            }
            align="left"
          />
          {/* The city travels with the enquiry, so the lead records which
              city page produced it — the number a city page is judged by. */}
          <EnquiryDialog
            action={submitEnquiryAction}
            cityId={city.id}
            triggerLabel={city.ctaLabel?.trim() || "Request a quotation"}
            triggerClassName={buttonStyles({ size: "lg" })}
            title={`Request a quotation — ${city.name}`}
            description="We reply within one working day."
            submitLabel="Send enquiry"
          />
        </div>
      </Section>
    </>
  );
}

/**
 * The top of a city page: a photograph behind the heading where one has been
 * chosen, a typographic hero where not. Same treatment as category banners,
 * for the same reasons.
 */
function CityHero({ city }: { city: PublicCity }) {
  const trail = [
    { label: "Home", href: "/" },
    { label: "Locations", href: "/locations" },
    { label: city.name },
  ];

  const heading = (
    <div className="flex max-w-[60ch] flex-col gap-4">
      <p className="text-overline text-primary uppercase">
        {city.name}, {city.state.name}
      </p>
      <h1 className="text-h1 text-ink">{cityHeadline(city)}</h1>
      {city.intro ? (
        <p className="text-body-lg text-ink-muted">{city.intro}</p>
      ) : null}
    </div>
  );

  if (!city.heroImage) {
    return (
      <>
        <Container className="pt-6">
          <Breadcrumb items={trail} />
        </Container>
        <Section spacing="normal" container="standard">
          {heading}
        </Section>
      </>
    );
  }

  return (
    <div className="relative isolate">
      <img
        src={city.heroImage.url}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="from-navy-950/95 via-navy-950/80 to-navy-950/55 absolute inset-0 -z-10 bg-gradient-to-r"
      />
      <div className="surface-dark bg-transparent [--color-primary:var(--color-medical-300)]">
        <Container className="pt-6">
          <Breadcrumb items={trail} />
        </Container>
        <Section
          spacing="large"
          container="standard"
          className="bg-transparent"
        >
          {heading}
        </Section>
      </div>
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */
