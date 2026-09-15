import Link from "next/link";

import { Container } from "@/components/ui";
import { getMenuTree } from "@/server/navigation/service";
import type { SiteSettings } from "@/server/settings/service";

function externalProps(href: string) {
  return href.startsWith("http")
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
}

export async function SiteFooter({ settings }: { settings: SiteSettings }) {
  const [columns, legal] = await Promise.all([
    getMenuTree("FOOTER"),
    getMenuTree("LEGAL"),
  ]);

  const year = new Date().getFullYear();
  const socialLinks = Object.entries(settings.social).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  return (
    <footer className="surface-dark border-line border-t">
      <Container className="flex flex-col gap-12 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <span className="text-h4 font-display">{settings.companyName}</span>
            {settings.tagline ? (
              <p className="text-body-sm text-ink-muted max-w-[46ch]">
                {settings.tagline}
              </p>
            ) : null}
          </div>

          {/* Each top-level item is a column; its children are that column's
              links. Columns with nothing under them are dropped rather than
              rendered as a heading over empty space. */}
          {columns
            .filter((column) => column.children.length > 0)
            .map((column) => (
              <nav key={column.id} aria-label={column.label}>
                <h2 className="text-label mb-4 font-medium">{column.label}</h2>
                <ul className="flex flex-col gap-2.5">
                  {column.children.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href ?? "#"}
                        {...(item.openInNewTab
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="text-body-sm text-ink-muted hover:text-ink transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

          <div className="text-body-sm text-ink-muted flex flex-col gap-2">
            <h2 className="text-label text-ink mb-2 font-medium">Contact</h2>
            {settings.email ? (
              <a href={`mailto:${settings.email}`} className="hover:text-ink">
                {settings.email}
              </a>
            ) : null}
            {settings.phone ? (
              <a
                href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                className="hover:text-ink"
              >
                {settings.phone}
              </a>
            ) : null}
            {settings.whatsapp ? (
              <a
                href={`https://wa.me/${settings.whatsapp}`}
                rel="noopener noreferrer"
                target="_blank"
                className="hover:text-ink"
              >
                WhatsApp
              </a>
            ) : null}
            {settings.address ? (
              <p className="max-w-[40ch] whitespace-pre-line">
                {settings.address}
              </p>
            ) : null}
            {settings.hours ? <p>{settings.hours}</p> : null}
          </div>
        </div>

        {socialLinks.length > 0 ? (
          <ul className="text-body-sm text-ink-muted flex flex-wrap gap-5">
            {socialLinks.map(([name, href]) => (
              <li key={name}>
                <a
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="hover:text-ink capitalize"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="border-line flex flex-col gap-3 border-t pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-caption text-ink-subtle">
            &copy; {year} {settings.companyName}
            {settings.gstin ? ` · GSTIN ${settings.gstin}` : ""}
          </p>

          {legal.length > 0 ? (
            <nav aria-label="Legal">
              <ul className="text-caption text-ink-subtle flex flex-wrap gap-5">
                {legal.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href ?? "#"}
                      {...externalProps(item.href ?? "")}
                      className="hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </Container>
    </footer>
  );
}
