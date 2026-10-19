import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Lock } from "lucide-react";

import { buttonStyles, Section } from "@/components/ui";
import { PageHero } from "@/components/site/page-hero";
import { PageCta } from "@/components/site/page-cta";
import { SmartImage } from "@/components/site/media";
import { CtaButton } from "@/components/site/cta/cta-button";
import { publicCatalogues, CATALOGUES_PATH } from "@/server/catalogues/service";
import { withSeoOverride } from "@/server/seo/overrides";

const DESCRIPTION =
  "Download our product catalogues as PDF: open and laparoscopy instruments, gynaecology instruments, endoscopy systems and more.";

const BASE_METADATA: Metadata = {
  title: "Catalogues",
  description: DESCRIPTION,
  alternates: { canonical: CATALOGUES_PATH },
};

/** The page's own metadata, with any override the SEO team has set for it. */
export async function generateMetadata(): Promise<Metadata> {
  return withSeoOverride(CATALOGUES_PATH, BASE_METADATA);
}

const sizeLabel = (bytes: number) =>
  bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Every published catalogue, each with a download button. A gated one opens
 * the download form first; the server stores the lead and only then returns
 * the file's address. An ungated one is a plain link to the PDF.
 */
export default async function CataloguesPage() {
  const catalogues = await publicCatalogues();

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Catalogues" }]}
        eyebrow="Downloads"
        title={
          <>
            Product <strong className="font-semibold">catalogues.</strong>
          </>
        }
        description={DESCRIPTION}
        size="lg"
        aside={
          catalogues[0]?.cover ? (
            <div className="stage-surface relative hidden aspect-[4/3] overflow-hidden rounded-[1.75rem] lg:block">
              <div className="absolute inset-[10%]">
                <SmartImage src={catalogues[0].cover.url} alt={catalogues[0].cover.alt} sizes="40vw" fit="contain" priority />
              </div>
            </div>
          ) : undefined
        }
      />

      <Section spacing="large" container="wide" background="pearl">
        {catalogues.length === 0 ? (
          <div className="border-line bg-surface flex flex-col items-start gap-4 rounded-2xl border p-8">
            <p className="text-body text-ink font-semibold">No catalogues are listed yet.</p>
            <p className="text-body-sm text-ink-muted max-w-[60ch]">
              Ask us for the catalogue you need and we will send it to you.
            </p>
            <Link href="/contact" className={buttonStyles({ variant: "outline" })}>
              Contact us
            </Link>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {catalogues.map((catalogue, index) => (
              <li key={catalogue.id}>
                <article className="border-line bg-surface flex h-full flex-col overflow-hidden rounded-2xl border">
                  <div className="bg-surface-panel relative aspect-[4/3]">
                    {catalogue.cover ? (
                      <SmartImage
                        src={catalogue.cover.url}
                        alt={catalogue.cover.alt}
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                        fit="contain"
                        priority={index < 3}
                      />
                    ) : (
                      <div className="text-primary flex h-full items-center justify-center">
                        <FileText aria-hidden="true" className="size-14" strokeWidth={1.25} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <p className="eyebrow">PDF · {sizeLabel(catalogue.sizeBytes)}</p>
                    <h2 className="text-body text-ink text-safe text-[1.125rem] leading-snug font-semibold">{catalogue.title}</h2>
                    {catalogue.description ? (
                      <p className="text-body-sm text-ink-muted leading-relaxed">{catalogue.description}</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      <CtaButton
                        request={{
                          kind: "DOWNLOAD_CATALOGUE",
                          placement: "catalogues.page",
                          catalogueId: catalogue.id,
                          documentTitle: catalogue.title,
                          gated: catalogue.gated,
                          href: catalogue.href,
                        }}
                        className={buttonStyles({ size: "md" })}
                        aria-label={`Download ${catalogue.title}`}
                      >
                        <Download aria-hidden="true" className="size-4" />
                        Download
                      </CtaButton>
                      {catalogue.gated ? (
                        <span className="text-ink-subtle inline-flex items-center gap-1.5 text-[0.75rem]">
                          <Lock aria-hidden="true" className="size-3.5" />
                          Short form first
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <PageCta
        title="Need a quotation from the catalogue?"
        body="Send us the codes and quantities you need — we will prepare a quotation for your requirement."
        actions={
          <>
            <Link href="/rfq" className={buttonStyles({ size: "lg" })}>
              Request a quote
            </Link>
            <Link href="/contact" className={buttonStyles({ variant: "outline-inverse", size: "lg" })}>
              Contact us
            </Link>
          </>
        }
      />
    </>
  );
}
