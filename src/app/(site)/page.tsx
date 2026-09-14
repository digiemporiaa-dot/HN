import { Section, SectionHeader } from "@/components/ui";
import { getSiteSettings } from "@/server/settings/service";

/**
 * Foundation placeholder. Phase 19 replaces this with the CMS-driven homepage
 * so that every section is reorderable by an administrator.
 */
export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <Section spacing="xl" background="default">
      <SectionHeader
        overline={settings.companyName}
        title={
          settings.tagline ??
          "Medical, surgical and hospital equipment for healthcare institutions"
        }
        description={settings.description ?? undefined}
        as="h1"
      />
    </Section>
  );
}
