import { Section, SectionHeader } from "@/components/ui";
import { siteConfig } from "@/lib/site-config";

/**
 * Foundation placeholder. Phase 19 replaces this with the CMS-driven homepage
 * so that every section is reorderable by an administrator.
 */
export default function HomePage() {
  return (
    <Section spacing="xl" background="default">
      <SectionHeader
        overline="HN Medical System"
        title="Medical, surgical and hospital equipment for healthcare institutions"
        description={siteConfig.shortDescription}
        as="h1"
      />
    </Section>
  );
}
