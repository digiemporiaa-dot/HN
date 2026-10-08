"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, Phone, X } from "lucide-react";

import { buttonStyles, Container } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { categoryVisual, sceneVisual } from "@/lib/visuals";
import type { NavigationNode } from "@/server/navigation/service";
import type { MegaLink, MegaMenuData } from "@/server/navigation/mega";
import { SmartImage } from "./media";

/** Which catalogue panel a plain top-level link opens, if any. */
export type MegaKind = "catalogue" | "specialties" | "solutions";

export type HeaderItem = NavigationNode & { mega: MegaKind | null };

function isActive(pathname: string, href: string | null): boolean {
  if (!href || !href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkProps(node: { openInNewTab: boolean }) {
  return node.openInNewTab
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
}

/* -------------------------------------------------------------- shell -- */

/**
 * The header's moving parts: whether the page has scrolled, and whether a
 * menu is open. Both are written to data attributes so the transparent-over-
 * hero treatment is pure CSS (see `.site-header` in globals.css) and the
 * server-rendered header never flashes the wrong colour on load.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      header.dataset.scrolled = window.scrollY > 12 ? "true" : "false";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={ref} className="site-header" data-scrolled="false">
      {children}
    </header>
  );
}

function setHeaderOpen(open: boolean) {
  const header = document.querySelector<HTMLElement>(".site-header");
  if (header) header.dataset.open = open ? "true" : "false";
}

/* --------------------------------------------------------- mega panels -- */

function PanelLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group text-body-sm text-primary inline-flex items-center gap-1.5 font-medium",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
    </Link>
  );
}

function CataloguePanel({ data, href }: { data: MegaMenuData; href: string }) {
  const categories = data.categories.slice(0, 9);
  const feature = data.categories.find((row) => row.image) ?? data.categories[0];
  const featureVisual = feature
    ? (feature.image ?? categoryVisual(feature.name))
    : sceneVisual("icu");

  return (
    <div className="grid gap-10 py-10 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="border-line mb-6 flex items-center justify-between border-b pb-4">
          <p className="eyebrow">Equipment categories</p>
          <PanelLink href={href}>View all products</PanelLink>
        </div>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-6 xl:grid-cols-3">
          {categories.map((category) => {
            const visual = category.image ?? categoryVisual(category.name);
            return (
              <li key={category.href} className="flex min-w-0 gap-3.5">
                <Link
                  href={category.href}
                  className="group media-frame border-line size-12 shrink-0 rounded-lg border"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <SmartImage src={visual.url} alt="" sizes="48px" />
                </Link>
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={category.href}
                    className="text-body-sm text-ink hover:text-primary font-semibold transition-colors"
                  >
                    {category.name}
                  </Link>
                  {category.children.length > 0 ? (
                    <ul className="flex flex-col gap-0.5">
                      {category.children.slice(0, 3).map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="text-caption text-ink-muted hover:text-ink line-clamp-1 transition-colors"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : category.count ? (
                    <span className="text-caption text-ink-subtle">
                      {category.count} product{category.count === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-5 lg:col-span-4">
        {feature ? (
          <Link
            href={feature.href}
            className="group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl p-6 text-white"
          >
            <div className="media-frame zoom-media absolute inset-0 -z-10">
              <SmartImage src={featureVisual.url} alt="" sizes="380px" />
            </div>
            <span
              aria-hidden="true"
              className="from-navy-975/90 via-navy-975/40 absolute inset-0 -z-10 bg-gradient-to-t to-transparent"
            />
            <span className="text-overline tracking-[0.14em] text-cyan-200 uppercase">
              Featured category
            </span>
            <span className="text-h4 mt-1 text-white">{feature.name}</span>
            {feature.summary ? (
              <span className="text-body-sm mt-1 line-clamp-2 text-white/75">
                {feature.summary}
              </span>
            ) : null}
            <span className="text-body-sm mt-3 inline-flex items-center gap-1.5 font-medium text-white">
              Explore range
              <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
            </span>
          </Link>
        ) : null}

        {data.specialties.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-caption text-ink-subtle font-medium tracking-wide uppercase">
              Browse by specialty
            </p>
            <ul className="flex flex-wrap gap-2">
              {data.specialties.slice(0, 6).map((row) => (
                <li key={row.href}>
                  <Link
                    href={row.href}
                    className="border-line text-caption text-ink hover:border-primary hover:text-primary inline-flex rounded-full border px-3 py-1.5 transition-colors"
                  >
                    {row.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CardsPanel({
  title,
  items,
  href,
  allLabel,
  kind,
}: {
  title: string;
  items: MegaLink[];
  href: string;
  allLabel: string;
  kind: "specialty" | "solution";
}) {
  const columns = kind === "solution" ? "xl:grid-cols-3" : "xl:grid-cols-4";
  return (
    <div className="py-10">
      <div className="border-line mb-6 flex items-center justify-between border-b pb-4">
        <p className="eyebrow">{title}</p>
        <PanelLink href={href}>{allLabel}</PanelLink>
      </div>
      <ul className={cn("grid grid-cols-2 gap-4 lg:grid-cols-3", columns)}>
        {items.map((item) => {
          const visual = item.image ?? sceneVisual(item.name);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group border-line hover:border-line-strong flex h-full items-center gap-4 rounded-xl border p-3 transition-colors"
              >
                <span className="media-frame zoom-media size-16 shrink-0 rounded-lg">
                  <SmartImage src={visual.url} alt="" sizes="64px" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body-sm text-ink group-hover:text-primary font-semibold transition-colors">
                    {item.name}
                  </span>
                  {item.summary ? (
                    <span className="text-caption text-ink-muted line-clamp-2">
                      {item.summary}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Columns built by an administrator in the CMS menu. */
function MenuColumnsPanel({ node }: { node: NavigationNode }) {
  return (
    <div className="flex flex-col gap-6 py-10">
      {node.href ? (
        <div className="border-line flex items-center justify-between border-b pb-4">
          <p className="eyebrow">{node.label}</p>
          <PanelLink href={node.href}>All {node.label.toLowerCase()}</PanelLink>
        </div>
      ) : null}
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        {node.children.map((child) => (
          <div key={child.id} className="flex flex-col gap-3">
            {child.href ? (
              <Link
                href={child.href}
                {...linkProps(child)}
                className="text-body-sm text-ink hover:text-primary font-semibold transition-colors"
              >
                {child.label}
              </Link>
            ) : (
              <span className="text-body-sm text-ink font-semibold">
                {child.label}
              </span>
            )}
            {child.description ? (
              <p className="text-caption text-ink-subtle max-w-[34ch]">
                {child.description}
              </p>
            ) : null}
            {child.children.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {child.children.map((leaf) => (
                  <li key={leaf.id}>
                    <Link
                      href={leaf.href ?? "#"}
                      {...linkProps(leaf)}
                      className="text-body-sm text-ink-muted hover:text-primary block transition-colors"
                    >
                      {leaf.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        {node.imageUrl ? (
          <div className="border-line relative hidden aspect-[4/3] overflow-hidden rounded-xl border lg:block">
            <SmartImage src={node.imageUrl} alt={node.imageAlt} sizes="300px" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function panelFor(item: HeaderItem, data: MegaMenuData): ReactNode | null {
  if (item.children.length > 0) return <MenuColumnsPanel node={item} />;
  if (item.mega === "catalogue" && data.categories.length > 0)
    return <CataloguePanel data={data} href={item.href ?? "/products"} />;
  if (item.mega === "specialties" && data.specialties.length > 0)
    return (
      <CardsPanel
        title="Clinical specialties"
        items={data.specialties}
        href={item.href ?? "/specialties"}
        allLabel="All specialties"
        kind="specialty"
      />
    );
  if (item.mega === "solutions" && data.solutions.length > 0)
    return (
      <CardsPanel
        title="Healthcare solutions"
        items={data.solutions}
        href={item.href ?? "/solutions"}
        allLabel="All solutions"
        kind="solution"
      />
    );
  return null;
}

/* ------------------------------------------------------------ desktop -- */

function DesktopEntry({
  item,
  data,
  openId,
  setOpenId,
  pathname,
}: {
  item: HeaderItem;
  data: MegaMenuData;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  pathname: string;
}) {
  const panel = panelFor(item, data);
  const open = openId === item.id;
  const active = isActive(pathname, item.href);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const navLink = cn(
    "relative flex h-[var(--header-h)] items-center gap-1 px-0.5 text-[0.875rem] font-medium tracking-[-0.005em] transition-colors",
    "after:absolute after:inset-x-0.5 after:bottom-[1.15rem] after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-[var(--duration-base)]",
    "hover:text-primary",
    active || open ? "text-ink after:scale-x-100" : "text-ink",
  );

  if (!panel) {
    return (
      <li onMouseEnter={() => setOpenId(null)}>
        <Link
          href={item.href ?? "#"}
          {...linkProps(item)}
          aria-current={active ? "page" : undefined}
          className={navLink}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <li
      onMouseEnter={() => {
        cancelClose();
        setOpenId(item.id);
      }}
      onMouseLeave={() => {
        cancelClose();
        closeTimer.current = setTimeout(() => setOpenId(null), 140);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpenId(null);
        }
      }}
    >
      {/* The label is a link (it has a destination); the chevron button is
          the keyboard and touch control for the panel. */}
      <div className="flex items-center">
        <Link
          href={item.href ?? "#"}
          {...linkProps(item)}
          aria-current={active ? "page" : undefined}
          className={navLink}
          onClick={() => setOpenId(null)}
        >
          {item.label}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${open ? "Close" : "Open"} ${item.label} menu`}
          onClick={() => setOpenId(open ? null : item.id)}
          className="text-ink-muted hover:text-ink -ml-0.5 flex size-7 items-center justify-center rounded-md transition-colors"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 transition-transform duration-[var(--duration-base)]",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      <div
        id={panelId}
        inert={!open}
        className={cn(
          "surface-reset bg-surface text-ink border-line absolute inset-x-0 top-full border-t shadow-[0_30px_60px_-34px_rgb(11_13_15/0.28)]",
          "origin-top transition-[opacity,transform,visibility] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-1 opacity-0",
        )}
      >
        <Container width="wide">{panel}</Container>
      </div>
    </li>
  );
}

export function DesktopNav({
  items,
  data,
}: {
  items: HeaderItem[];
  data: MegaMenuData;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => setOpenId(null), [pathname]);

  useEffect(() => {
    setHeaderOpen(openId !== null);
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Main" className="hidden xl:block">
      <ul className="flex items-center gap-7 2xl:gap-9">
        {items.map((item) => (
          <DesktopEntry
            key={item.id}
            item={item}
            data={data}
            openId={openId}
            setOpenId={setOpenId}
            pathname={pathname}
          />
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------- mobile -- */

function MobileSection({
  item,
  data,
  expanded,
  onToggle,
}: {
  item: HeaderItem;
  data: MegaMenuData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const links: Array<{ label: string; href: string; sub?: string }> =
    item.children.length > 0
      ? item.children.flatMap((child) => [
          ...(child.href ? [{ label: child.label, href: child.href }] : []),
          ...child.children.map((leaf) => ({
            label: leaf.label,
            href: leaf.href ?? "#",
            sub: child.label,
          })),
        ])
      : item.mega === "catalogue"
        ? data.categories.map((row) => ({ label: row.name, href: row.href }))
        : item.mega === "specialties"
          ? data.specialties.map((row) => ({ label: row.name, href: row.href }))
          : item.mega === "solutions"
            ? data.solutions.map((row) => ({ label: row.name, href: row.href }))
            : [];

  if (links.length === 0) {
    return (
      <Link
        href={item.href ?? "#"}
        {...linkProps(item)}
        className="border-line text-ink flex min-h-14 items-center justify-between border-b text-[1.0625rem] font-medium"
      >
        {item.label}
        <ArrowRight aria-hidden="true" className="text-ink-subtle size-4" />
      </Link>
    );
  }

  return (
    <div className="border-line border-b">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="text-ink flex min-h-14 w-full items-center justify-between text-left text-[1.0625rem] font-medium"
      >
        {item.label}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "text-ink-subtle size-5 transition-transform duration-[var(--duration-base)]",
            expanded && "rotate-180",
          )}
        />
      </button>
      <div
        id={panelId}
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul className="grid gap-1 pb-4 sm:grid-cols-2">
            {item.href ? (
              <li className="sm:col-span-2">
                <Link
                  href={item.href}
                  className="text-body-sm text-primary flex min-h-11 items-center gap-1.5 font-semibold"
                >
                  View all {item.label.toLowerCase()}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </li>
            ) : null}
            {links.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <Link
                  href={link.href}
                  className="text-body-sm text-ink-muted hover:text-ink flex min-h-11 items-center rounded-md"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function MobileNav({
  items,
  data,
  companyName,
  phone,
  quoteHref,
}: {
  items: HeaderItem[];
  data: MegaMenuData;
  companyName: string;
  phone: string | null;
  quoteHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    setOpen(false);
    setExpanded(null);
  }, [pathname]);

  // While open: no page scroll behind the panel, Escape closes, and focus
  // starts inside the panel.
  useEffect(() => {
    setHeaderOpen(open);
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Closing the menu at desktop width, so a resized window never keeps a
  // locked scroll and an invisible panel.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const onChange = () => query.matches && setOpen(false);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="xl:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        className="text-ink hover:bg-surface-muted -mr-2 flex size-11 items-center justify-center rounded-lg transition-colors"
      >
        <span className="sr-only">
          {open ? "Close menu" : `Open ${companyName} menu`}
        </span>
        {open ? (
          <X aria-hidden="true" className="size-6" />
        ) : (
          <Menu aria-hidden="true" className="size-6" />
        )}
      </button>

      <div
        id="mobile-navigation"
        ref={panelRef}
        inert={!open}
        className={cn(
          "surface-reset bg-surface text-ink fixed inset-x-0 top-[var(--header-h)] bottom-0 z-40 flex flex-col",
          "transition-[opacity,transform,visibility] duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]",
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0",
        )}
      >
        <nav aria-label="Main" className="flex-1 overflow-y-auto overscroll-contain">
          <Container className="py-2">
            {items.map((item) => (
              <MobileSection
                key={item.id}
                item={item}
                data={data}
                expanded={expanded === item.id}
                onToggle={() =>
                  setExpanded(expanded === item.id ? null : item.id)
                }
              />
            ))}
          </Container>
        </nav>
        <div className="border-line bg-surface-subtle border-t">
          <Container className="flex flex-col gap-3 py-4 sm:flex-row">
            <Link
              href={quoteHref}
              className={cn(buttonStyles({ size: "lg" }), "w-full sm:w-auto")}
            >
              Request a quote
            </Link>
            {phone ? (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className={cn(
                  buttonStyles({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto",
                )}
              >
                <Phone aria-hidden="true" className="size-4" />
                {phone}
              </a>
            ) : null}
          </Container>
        </div>
      </div>
    </div>
  );
}
