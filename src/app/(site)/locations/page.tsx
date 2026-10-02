import type { Metadata } from "next";
import Link from "next/link";

import {
  Breadcrumb,
  Container,
  EmptyState,
  Section,
  SectionHeader,
} from "@/components/ui";
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
 * Every published city, grouped by state.
 *
 * A list of names rather than a map: a map of India with a handful of pins is
 * a picture of how much is missing, and the visitor who opens this page wants
 * to find one city, which a list in alphabetical order does better.
 */
export default async function LocationsPage() {
  const states = await locationsIndex();
  const total = states.reduce((sum, state) => sum + state.cities.length, 0);

  return (
    <>
      <Container className="pt-6">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Locations" }]}
        />
      </Container>

      <Section spacing="normal" container="standard">
        <SectionHeader
          title="Locations"
          description={DESCRIPTION}
          align="left"
        />

        {total === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No locations yet"
              description="City pages are being prepared. In the meantime, every product page takes an enquiry from anywhere in India."
            />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {states.map((state) => (
              <section key={state.id} aria-labelledby={`state-${state.id}`}>
                <h2
                  id={`state-${state.id}`}
                  className="text-overline text-ink-subtle border-line border-b pb-2 uppercase"
                >
                  {state.name}
                </h2>
                <ul className="mt-3 flex flex-col">
                  {state.cities.map((city) => (
                    <li key={city.id}>
                      <Link
                        href={city.href}
                        className="text-body text-ink hover:text-primary group flex flex-col gap-0.5 rounded-md py-2 transition-colors"
                      >
                        <span className="font-medium">{city.name}</span>
                        {city.headline ? (
                          <span className="text-body-sm text-ink-muted group-hover:text-ink-muted line-clamp-1">
                            {city.headline}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
