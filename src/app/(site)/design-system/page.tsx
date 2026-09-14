import type { Metadata } from "next";

import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  Section,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { InteractivePreview } from "./interactive-preview";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const TYPE_SCALE = [
  { token: "text-display-1", label: "Display 1" },
  { token: "text-display-2", label: "Display 2" },
  { token: "text-h1", label: "Heading 1" },
  { token: "text-h2", label: "Heading 2" },
  { token: "text-h3", label: "Heading 3" },
  { token: "text-h4", label: "Heading 4" },
  { token: "text-body-lg", label: "Body large" },
  { token: "text-body", label: "Body" },
  { token: "text-body-sm", label: "Body small" },
  { token: "text-caption", label: "Caption" },
  { token: "text-label", label: "Label" },
];

const PALETTES = [
  { name: "Navy", prefix: "navy" },
  { name: "Medical Blue", prefix: "medical" },
  { name: "Steel", prefix: "steel" },
];

const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

export default function DesignSystemPage() {
  return (
    <>
      <Section spacing="large" background="light">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Design system" }]}
          className="mb-8"
        />
        <SectionHeader
          overline="Internal reference"
          title="Design system"
          description="The shared visual language every page and admin screen is built from. This page is excluded from search indexing."
          as="h1"
        />
      </Section>

      <Section spacing="large">
        <SectionHeader title="Colour" className="mb-8" />
        <div className="flex flex-col gap-8">
          {PALETTES.map((palette) => (
            <div key={palette.prefix} className="flex flex-col gap-3">
              <h3 className="text-h4 text-ink">{palette.name}</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-11">
                {SHADES.map((shade) => (
                  <div key={shade} className="flex flex-col gap-1.5">
                    <div
                      className="border-line h-14 rounded-md border"
                      style={{
                        backgroundColor: `var(--color-${palette.prefix}-${shade})`,
                      }}
                    />
                    <span className="text-caption text-ink-subtle">{shade}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section spacing="large" background="light">
        <SectionHeader title="Typography" className="mb-8" />
        <div className="border-line divide-line divide-y border-y">
          {TYPE_SCALE.map((entry) => (
            <div
              key={entry.token}
              className="flex flex-col gap-2 py-5 md:flex-row md:items-baseline md:gap-8"
            >
              <code className="text-caption text-ink-subtle w-40 shrink-0 font-mono">
                {entry.token}
              </code>
              <p className={`${entry.token} text-ink`}>
                Advanced medical equipment
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section spacing="large">
        <SectionHeader title="Buttons" className="mb-8" />
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Request a Quote</Button>
            <Button variant="secondary">Talk to Sales</Button>
            <Button variant="outline">Download Brochure</Button>
            <Button variant="ghost">Learn more</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="link">Inline link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Submitting</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Section>

      <Section spacing="large" background="light">
        <SectionHeader title="Badges and status" className="mb-8" />
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="outline">Outline</Badge>
          <StatusBadge status="PUBLISHED" />
          <StatusBadge status="DRAFT" />
          <StatusBadge status="REVIEW" />
          <StatusBadge status="ARCHIVED" />
        </div>
      </Section>

      <Section spacing="large">
        <SectionHeader title="Cards" className="mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {(["standard", "bordered", "elevated", "minimal"] as const).map(
            (appearance) => (
              <Card key={appearance} appearance={appearance} interactive>
                <CardHeader>
                  <CardTitle className="capitalize">{appearance}</CardTitle>
                  <CardDescription>
                    Card treatments available to CMS editors.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-ink-muted">
                    Editors choose from these four options — never arbitrary
                    styling.
                  </p>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      </Section>

      <Section spacing="large" background="dark">
        <SectionHeader
          overline="Surface"
          title="Dark sections re-theme automatically"
          description="Semantic tokens are remapped on the container, so components inherit the correct foreground, muted and border colours without knowing which background they sit on."
          className="mb-8"
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Request a Quote</Button>
          <Button variant="outline">Download Brochure</Button>
          <Badge tone="outline">Enterprise</Badge>
        </div>
      </Section>

      <Section spacing="large">
        <SectionHeader title="Interactive components" className="mb-8" />
        <InteractivePreview />
      </Section>

      <Section spacing="large" background="light">
        <SectionHeader title="Empty, loading and error states" className="mb-8" />
        <div className="grid gap-6 lg:grid-cols-3">
          <EmptyState
            title="No products found"
            description="Try removing a filter or broadening your search."
            action={<Button variant="outline">Clear filters</Button>}
          />
          <ErrorState description="The product catalogue could not be loaded." />
          <div className="border-line bg-surface rounded-lg border p-6">
            <LoadingState rows={5} />
          </div>
        </div>
      </Section>

      <Section spacing="large">
        <SectionHeader title="Pagination" className="mb-8" />
        <Pagination
          currentPage={4}
          totalPages={12}
          buildHref={(page) => `/design-system?page=${page}`}
        />
      </Section>
    </>
  );
}
