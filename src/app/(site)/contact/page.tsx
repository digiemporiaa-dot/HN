import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ClipboardList,
  Clock,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import { Section } from "@/components/ui";
import { PageHero } from "@/components/site/page-hero";
import { SCENES } from "@/lib/visuals";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { getSiteSettings } from "@/server/settings/service";
import { submitEnquiryAction } from "@/server/leads/actions";
import { withSeoOverride } from "@/server/seo/overrides";
import { JsonLd } from "@/components/seo/json-ld";
import { contactPageJsonLd } from "@/server/seo/structured-data";

const DESCRIPTION =
  "Ask about a product, a department or a whole project. Our sales team replies within one working day.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return withSeoOverride("/contact", {
    title: "Contact",
    description: `Contact ${settings.companyName}. ${DESCRIPTION}`,
    alternates: { canonical: "/contact" },
  });
}

const NEXT_STEPS = [
  "A specialist for the equipment you asked about reviews your enquiry.",
  "We confirm configuration, quantities and site requirements with you.",
  "You receive a written quotation with delivery and installation terms.",
];

type Channel = {
  key: string;
  icon: typeof Phone;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  /** A second line under the value, such as a link to the map. */
  extra?: { label: string; href: string };
};

/**
 * The contact page.
 *
 * A route rather than a CMS page because everything on it already has a home:
 * the details are the settings the header and footer read, and the form is the
 * enquiry form every other page uses. Writing them again in a page would give
 * the phone number two places to be wrong in.
 *
 * Only what has been filled in is shown. A blank address is no address, not
 * a placeholder, and with no details at all the page is simply the form.
 */
export default async function ContactPage() {
  const settings = await getSiteSettings();

  const candidates: Array<Channel | null> = [
    settings.phone
      ? {
          key: "phone",
          icon: Phone,
          label: "Phone",
          value: settings.phone,
          href: `tel:${settings.phone.replace(/[^\d+]/g, "")}`,
        }
      : null,
    settings.email
      ? {
          key: "email",
          icon: Mail,
          label: "Email",
          value: settings.email,
          href: `mailto:${settings.email}`,
        }
      : null,
    settings.whatsapp
      ? {
          key: "whatsapp",
          icon: MessageCircle,
          label: "WhatsApp",
          value: "Chat with our sales team",
          href: `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`,
          external: true,
        }
      : null,
    settings.address
      ? {
          key: "address",
          icon: MapPin,
          label: "Office",
          value: settings.address,
          // A link to a map search rather than an embedded map: an embed
          // loads a third party's scripts and cookies on a page whose whole
          // purpose is to collect a visitor's details.
          extra: {
            label: "Open in Google Maps",
            href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              settings.address.replace(/\s+/g, " "),
            )}`,
          },
        }
      : null,
    settings.hours
      ? { key: "hours", icon: Clock, label: "Hours", value: settings.hours }
      : null,
    settings.gstin
      ? {
          key: "gstin",
          icon: Building2,
          label: "GSTIN",
          value: settings.gstin,
        }
      : null,
  ];
  const channels = candidates.filter(
    (channel): channel is Channel => channel !== null,
  );

  const routes = [
    {
      icon: ClipboardList,
      title: "Request a quotation",
      body: "Build a list of equipment with quantities and send it as one request.",
      href: "/rfq",
      cta: "Start a quote",
    },
    {
      icon: LayoutGrid,
      title: "Browse the catalogue",
      body: "Search products by category, specialty or manufacturer.",
      href: "/products",
      cta: "View products",
    },
    {
      icon: MapPin,
      title: "Supply in your city",
      body: "See how supply, installation and support work where you are.",
      href: "/locations",
      cta: "Find a city",
    },
  ];

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        eyebrow={`Contact ${settings.companyName}`}
        title="Talk to our healthcare equipment team."
        description={DESCRIPTION}
        image={SCENES.station}
        imageFit="cover"
      />

      <Section spacing="large" container="wide">
        <div
          className={
            channels.length > 0
              ? "grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14"
              : "mx-auto max-w-[48rem]"
          }
        >
          <div className="bg-surface-panel relative min-w-0 rounded-xl p-5 sm:p-10 lg:col-span-7">
            <div className="mb-8 flex flex-col gap-2">
              <span className="eyebrow">Enquiry</span>
              <h2 className="text-h2 text-ink">Send us your requirement.</h2>
              <p className="text-body text-ink-muted max-w-[56ch]">
                A product, a department or a whole project — a few details are
                enough for the right specialist to reply.
              </p>
            </div>
            <EnquiryForm action={submitEnquiryAction} submitLabel="Send enquiry" />
          </div>

          {channels.length > 0 ? (
            <aside aria-labelledby="contact-details" className="flex min-w-0 flex-col gap-8 lg:col-span-5">
              <div className="flex flex-col gap-2">
                <span className="eyebrow">Direct</span>
                <h2 id="contact-details" className="text-h3 text-ink">
                  Other ways to reach us
                </h2>
              </div>
              <dl className="border-line grid grid-cols-1 border-t sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-1">
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <div
                      key={channel.key}
                      className="border-line relative flex gap-4 border-b py-5"
                    >
                      <span className="bg-medical-50 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <dt className="text-caption text-ink-subtle font-semibold tracking-[0.12em] uppercase">
                          {channel.label}
                        </dt>
                        <dd className="text-body text-ink font-medium whitespace-pre-line [overflow-wrap:anywhere]">
                          {channel.href ? (
                            <a
                              href={channel.href}
                              className="hover:text-primary underline-offset-4 transition-colors hover:underline"
                              {...(channel.external
                                ? { target: "_blank", rel: "noopener noreferrer" }
                                : {})}
                            >
                              {channel.value}
                            </a>
                          ) : (
                            channel.value
                          )}
                        </dd>
                        {channel.extra ? (
                          <dd>
                            <a
                              href={channel.extra.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-body-sm text-primary inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                            >
                              {channel.extra.label}
                              <ArrowUpRight aria-hidden="true" className="size-3.5" />
                            </a>
                          </dd>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </dl>

              <div className="bg-surface-panel rounded-xl p-6">
                <h3 className="text-h4 text-ink">What happens next</h3>
                <ol className="mt-4 flex flex-col gap-4">
                  {NEXT_STEPS.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="border-line bg-surface text-caption text-primary flex size-7 shrink-0 items-center justify-center rounded-full border font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-body-sm text-ink-muted pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          ) : null}
        </div>
      </Section>

      <Section spacing="normal" container="wide" background="pearl">
        <ul className="reveal-stagger grid gap-4 md:grid-cols-3 lg:gap-6">
          {routes.map((route) => {
            const Icon = route.icon;
            return (
              <li
                key={route.href}
                className="group border-ink/15 relative flex flex-col gap-4 border-t pt-6"
              >
                <span className="text-primary">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-h4 text-ink">
                    <Link href={route.href} className="after:absolute after:inset-0 after:rounded-2xl">
                      {route.title}
                    </Link>
                  </h2>
                  <p className="text-body-sm text-ink-muted">{route.body}</p>
                </div>
                <span className="text-body-sm text-primary mt-auto inline-flex items-center gap-1.5 font-semibold">
                  {route.cta}
                  <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <JsonLd data={contactPageJsonLd(settings)} />
    </>
  );
}
