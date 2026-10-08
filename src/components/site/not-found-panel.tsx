import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { buttonStyles, Container } from "@/components/ui";

const SHORTCUTS = [
  { label: "Products", href: "/products" },
  { label: "Specialties", href: "/specialties" },
  { label: "Solutions", href: "/solutions" },
  { label: "Locations", href: "/locations" },
  { label: "Insights", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/**
 * The body of a 404: what happened, a catalogue search, and the places a
 * visitor most likely meant to go. Shared by the site's own not-found page,
 * which sits inside the header and footer, and the bare root fallback.
 */
export function NotFoundPanel({ as: Tag = "section" }: { as?: "main" | "section" }) {
  return (
    <Tag className="surface-grid relative isolate flex min-h-[min(72svh,52rem)] flex-1 items-center overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] -z-10 size-[36rem] rounded-full bg-[radial-gradient(circle,rgb(47_189_214/0.12),transparent_65%)]"
      />
      <Container width="standard" className="py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-20">
          <div className="flex max-w-[44rem] flex-col gap-6">
            <span className="eyebrow intro">Error 404</span>
            <h1 className="intro text-section text-ink text-safe [--i:1]">
              We couldn’t find that page.
            </h1>
            <p className="intro text-lead text-ink-muted max-w-[52ch] [--i:2]">
              It may have been moved, renamed or withdrawn from the catalogue.
              Search for the equipment you need, or start from one of the
              sections below.
            </p>

            <form
              action="/products"
              role="search"
              className="intro border-line-strong focus-within:border-primary focus-within:ring-primary/15 flex w-full max-w-[32rem] items-center gap-2 rounded-xl border bg-white p-1.5 pl-4 shadow-[var(--shadow-card)] focus-within:ring-4 [--i:3]"
            >
              <Search aria-hidden="true" className="text-ink-subtle size-5 shrink-0" />
              <label htmlFor="not-found-search" className="sr-only">
                Search products
              </label>
              <input
                id="not-found-search"
                type="search"
                name="q"
                placeholder="Search equipment or model"
                className="text-body text-ink placeholder:text-ink-subtle h-11 min-w-0 flex-1 bg-transparent outline-none"
              />
              <button type="submit" className={buttonStyles({ size: "md" })}>
                Search
              </button>
            </form>

            <div className="intro flex flex-col gap-3 pt-2 sm:flex-row [--i:4]">
              <Link href="/" className={buttonStyles({ size: "lg" })}>
                Return to homepage
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/rfq" className={buttonStyles({ variant: "outline", size: "lg" })}>
                Request a quote
              </Link>
            </div>
          </div>

          <nav aria-label="Popular sections" className="intro [--i:3]">
            <p className="text-caption text-ink-subtle mb-3 font-semibold tracking-[0.14em] uppercase">
              Popular sections
            </p>
            <ul className="border-line bg-line grid grid-cols-2 gap-px overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] lg:w-72 lg:grid-cols-1">
              {SHORTCUTS.map((link) => (
                <li key={link.href} className="bg-surface">
                  <Link
                    href={link.href}
                    className="group text-body text-ink hover:bg-surface-pearl hover:text-primary flex items-center justify-between gap-3 px-5 py-4 font-medium transition-colors"
                  >
                    {link.label}
                    <ArrowRight aria-hidden="true" className="arrow-nudge text-ink-subtle size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </Tag>
  );
}
