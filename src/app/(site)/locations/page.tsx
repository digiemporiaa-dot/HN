import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { buttonStyles, EmptyState, Section, SectionHeader } from "@/components/ui";
import { MetaChip, PageHero } from "@/components/site/page-hero";
import { PageCta } from "@/components/site/page-cta";
import { groupByRegion, REGIONS } from "@/lib/regions";
import { SCENES } from "@/lib/visuals";
import { locationsIndex } from "@/server/locations/public";
import { withSeoOverride } from "@/server/seo/overrides";

const DESCRIPTION =
  "The cities we supply, install and service medical and surgical equipment in, by state.";

const BASE_METADATA: Metadata = {
  title: "Locations",
  description: DESCRIPTION,
  alternates: { canonical: "/locations" },
};

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/locations", BASE_METADATA);
}

/**
 * Every published city, grouped by region and state.
 *
 * Lists rather than a map: a map of India with a handful of pins is a picture
 * of how much is missing, and the visitor who opens this page wants to find
 * one city, which an organised list does better.
 */
export default async function LocationsPage() {
  const states = await locationsIndex();
  const total = states.reduce((sum, state) => sum + state.cities.length, 0);
  const regions = groupByRegion(
    states.map((state) => ({ name: state.name, cities: [state] })),
  );

  return (
    <>
      <PageHero
        variant="image"
        image={SCENES.corridor}
        trail={[{ label: "Home", href: "/" }, { label: "Locations" }]}
        eyebrow="Pan-India coverage"
        title="Supplying healthcare institutions across India."
        description="Equipment supply, installation and support for hospitals, clinics and diagnostic centres — with local pages for the cities we serve most often."
        meta={
          total > 0 ? (
            <>
              <MetaChip>
                {total} cit{total === 1 ? "y" : "ies"}
              </MetaChip>
              <MetaChip>{states.length} state{states.length === 1 ? "" : "s"}</MetaChip>
              <MetaChip>{regions.length} region{regions.length === 1 ? "" : "s"}</MetaChip>
            </>
          ) : undefined
        }
      />

      <Section spacing="large" container="wide">
        {total === 0 ? (
          <div className="flex flex-col gap-10">
            <EmptyState
              icon={<MapPin aria-hidden="true" className="size-6" />}
              title="City pages are being prepared"
              description="We supply institutions across India. Every product page takes an enquiry from anywhere in the country."
              action={
                <Link href="/contact" className={buttonStyles({})}>
                  Contact our team
                </Link>
              }
            />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REGIONS.map(([region]) => (
                <li key={region} className="border-line bg-surface text-body-sm text-ink flex items-center gap-3 rounded-2xl border p-5 font-medium">
                  <MapPin aria-hidden="true" className="text-primary size-4" />
                  {region}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-14">
            <SectionHeader
              overline="Browse by region"
              title="Find your city."
              description="Each city page lists the equipment hospitals there most often ask about, and how supply and installation work locally."
            />
            <div className="flex flex-col">
              {regions.map(([region, stateGroups]) => (
                <section key={region} aria-labelledby={`region-${region}`} className="reveal border-ink/15 grid gap-6 border-t py-10 lg:grid-cols-12 lg:gap-10">
                  <div className="lg:col-span-3">
                    <h2 id={`region-${region}`} className="text-h3 text-ink">{region}</h2>
                    <p className="text-ink-subtle mt-1 text-[0.75rem]">
                      {stateGroups.reduce((sum, state) => sum + state.cities.length, 0)} cities
                    </p>
                  </div>
                  <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-9 xl:grid-cols-3">
                    {stateGroups.map((state) => (
                      <div key={state.id} className="flex flex-col gap-2">
                        <h3 className="text-ink-subtle text-[0.75rem] font-semibold tracking-[0.1em] uppercase">
                          {state.name}
                        </h3>
                        <ul className="flex flex-col">
                          {state.cities.map((city) => (
                            <li key={city.id} className="border-line border-b">
                              <Link href={city.href} className="group flex items-center justify-between gap-3 py-3">
                                <span className="flex min-w-0 flex-col">
                                  <span className="text-ink group-hover:text-primary text-[1.0625rem] transition-colors">
                                    {city.name}
                                  </span>
                                  {city.headline ? (
                                    <span className="text-ink-muted line-clamp-1 text-[0.8125rem]">{city.headline}</span>
                                  ) : null}
                                </span>
                                <ArrowRight aria-hidden="true" className="arrow-nudge text-ink-subtle size-4 shrink-0" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </Section>

      <PageCta
        title="Equipping a facility outside these cities?"
        body="We work with institutions across India. Tell us about the project and our team will coordinate supply and installation."
        actions={
          <>
            <Link href="/rfq" className={buttonStyles({ size: "lg" })}>
              Request a quote
            </Link>
            <Link href="/contact" className={buttonStyles({ variant: "outline-inverse", size: "lg" })}>
              Contact our team
            </Link>
          </>
        }
      />
    </>
  );
}
