import type { Metadata } from "next";
import {
  Building2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import { Breadcrumb, Container, Section } from "@/components/ui";
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

  return (
    <>
      <JsonLd data={contactPageJsonLd(settings)} />
      <Container className="pt-6">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        />
      </Container>

      <Section spacing="normal" container="standard">
        <div className="flex max-w-[60ch] flex-col gap-4">
          <p className="text-overline text-primary uppercase">
            {settings.companyName}
          </p>
          <h1 className="text-h1 text-ink">Contact us</h1>
          <p className="text-body-lg text-ink-muted">{DESCRIPTION}</p>
        </div>

        <div
          className={
            channels.length > 0
              ? "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16"
              : "mt-10 max-w-[44rem]"
          }
        >
          <div className="border-line bg-surface rounded-lg border p-6 sm:p-8">
            <h2 className="text-h4 text-ink mb-6">Send an enquiry</h2>
            <EnquiryForm
              action={submitEnquiryAction}
              submitLabel="Send enquiry"
            />
          </div>

          {channels.length > 0 ? (
            <aside aria-labelledby="contact-details">
              <h2 id="contact-details" className="text-h4 text-ink mb-6">
                Other ways to reach us
              </h2>
              <dl className="flex flex-col gap-6">
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <div key={channel.key} className="flex gap-4">
                      <span className="bg-surface-muted text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <dt className="text-caption text-ink-subtle uppercase">
                          {channel.label}
                        </dt>
                        <dd className="text-body text-ink break-words whitespace-pre-line">
                          {channel.href ? (
                            <a
                              href={channel.href}
                              className="hover:text-primary underline-offset-4 transition-colors hover:underline"
                              {...(channel.external
                                ? {
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                  }
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
                              className="text-body-sm text-primary underline underline-offset-4"
                            >
                              {channel.extra.label}
                            </a>
                          </dd>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </dl>
            </aside>
          ) : null}
        </div>
      </Section>
    </>
  );
}
