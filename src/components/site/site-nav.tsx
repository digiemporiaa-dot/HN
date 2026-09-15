"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";

import { buttonStyles, Container } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { NavigationNode } from "@/server/navigation/service";

/* eslint-disable @next/next/no-img-element -- menu images are served from our
   own media route at their stored size. */

function isActive(pathname: string, href: string | null): boolean {
  if (!href || !href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkProps(node: NavigationNode) {
  return node.openInNewTab
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
}

/** A column of links inside an open mega menu. */
function MegaColumn({ node }: { node: NavigationNode }) {
  return (
    <div className="flex flex-col gap-3">
      {node.href ? (
        <Link
          href={node.href}
          {...linkProps(node)}
          className="text-label text-ink hover:text-primary font-medium transition-colors"
        >
          {node.label}
        </Link>
      ) : (
        <span className="text-label text-ink font-medium">{node.label}</span>
      )}

      {node.description ? (
        <p className="text-caption text-ink-subtle max-w-[34ch]">
          {node.description}
        </p>
      ) : null}

      {node.children.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {node.children.map((child) => (
            <li key={child.id}>
              <Link
                href={child.href ?? "#"}
                {...linkProps(child)}
                className="text-body-sm text-ink-muted hover:text-primary block transition-colors"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * One top-level header entry.
 *
 * Opens on hover for pointers and on click for everything else, and closes on
 * Escape or focus leaving the panel — hover alone would make the menu
 * unusable by keyboard and unreachable on touch.
 */
function HeaderEntry({
  node,
  openId,
  setOpenId,
  pathname,
}: {
  node: NavigationNode;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  pathname: string;
}) {
  const hasChildren = node.children.length > 0;
  const open = openId === node.id;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  if (!hasChildren) {
    return (
      <li onMouseEnter={() => setOpenId(null)}>
        <Link
          href={node.href ?? "#"}
          {...linkProps(node)}
          aria-current={isActive(pathname, node.href) ? "page" : undefined}
          className={cn(
            node.highlight
              ? buttonStyles({ size: "sm" })
              : "text-body-sm text-ink-muted hover:text-ink px-1 py-2 transition-colors",
            !node.highlight &&
              isActive(pathname, node.href) &&
              "text-ink font-medium",
          )}
        >
          {node.label}
        </Link>
      </li>
    );
  }

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <li
      // A short delay before closing: the pointer has to cross a gap between
      // the trigger and the panel, and closing instantly makes that a miss.
      onMouseEnter={() => {
        cancelClose();
        setOpenId(node.id);
      }}
      onMouseLeave={() => {
        cancelClose();
        closeTimer.current = setTimeout(() => setOpenId(null), 120);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpenId(null);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpenId(open ? null : node.id)}
        className={cn(
          "text-body-sm text-ink-muted hover:text-ink flex items-center gap-1 px-1 py-2 transition-colors",
          open && "text-ink",
        )}
      >
        {node.label}
        <ChevronDown
          aria-hidden="true"
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      <div
        hidden={!open}
        className="border-line bg-surface absolute inset-x-0 top-full border-t shadow-lg"
      >
        <Container className="flex flex-col gap-6 py-8">
          {node.href ? (
            // The trigger is a button, so without this the destination an
            // administrator set on the parent would be unreachable.
            <Link
              href={node.href}
              {...linkProps(node)}
              className="text-body-sm text-primary w-fit font-medium underline underline-offset-4"
            >
              All {node.label.toLowerCase()}
            </Link>
          ) : null}

          <div className="grid gap-x-10 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {node.children.map((child) => (
            <MegaColumn key={child.id} node={child} />
          ))}

          {node.imageUrl ? (
            <div className="border-line bg-surface-subtle hidden flex-col gap-3 rounded-lg border p-4 lg:flex">
              <img
                src={node.imageUrl}
                alt={node.imageAlt}
                className="h-32 w-full rounded-md object-cover"
              />
              {node.description ? (
                <p className="text-caption text-ink-muted">
                  {node.description}
                </p>
              ) : null}
              {node.href ? (
                <Link
                  href={node.href}
                  className="text-body-sm text-primary font-medium underline underline-offset-4"
                >
                  {node.label}
                </Link>
              ) : null}
            </div>
          ) : null}
          </div>
        </Container>
      </div>
    </li>
  );
}

export function DesktopNav({ items }: { items: NavigationNode[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const pathname = usePathname();

  // Navigating with the menu open would otherwise leave the panel covering the
  // page the visitor just asked for.
  useEffect(() => setOpenId(null), [pathname]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-7">
        {items.map((node) => (
          <HeaderEntry
            key={node.id}
            node={node}
            openId={openId}
            setOpenId={setOpenId}
            pathname={pathname}
          />
        ))}
      </ul>
    </nav>
  );
}

/**
 * Mobile navigation.
 *
 * A plain disclosure list rather than the drawer component: the menu is a
 * document outline, and nesting it inside a dialog would trap focus around
 * content the visitor is trying to read past.
 */
export function MobileNav({
  items,
  companyName,
}: {
  items: NavigationNode[];
  companyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setExpanded(null);
  }, [pathname]);

  if (items.length === 0) return null;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        className="text-ink hover:bg-surface-muted -mr-2 rounded-md p-2 transition-colors"
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

      <nav
        id="mobile-navigation"
        aria-label="Main"
        hidden={!open}
        className="border-line bg-surface absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t shadow-lg"
      >
        <Container className="flex flex-col gap-1 py-4">
          {items.map((node) => {
            const hasChildren = node.children.length > 0;
            const isOpen = expanded === node.id;

            if (!hasChildren) {
              return (
                <Link
                  key={node.id}
                  href={node.href ?? "#"}
                  {...linkProps(node)}
                  className={cn(
                    "text-body text-ink rounded-md px-2 py-3",
                    node.highlight && "text-primary font-medium",
                  )}
                >
                  {node.label}
                </Link>
              );
            }

            return (
              <div key={node.id} className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : node.id)}
                  className="text-body text-ink flex items-center justify-between gap-3 rounded-md px-2 py-3 text-left"
                >
                  {node.label}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "text-ink-subtle size-4 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                <div hidden={!isOpen} className="flex flex-col gap-1 pb-2 pl-4">
                  {node.href ? (
                    <Link
                      href={node.href}
                      {...linkProps(node)}
                      className="text-body-sm text-primary rounded-md px-2 py-2 font-medium"
                    >
                      All {node.label.toLowerCase()}
                    </Link>
                  ) : null}

                  {node.children.map((child) => (
                    <div key={child.id} className="flex flex-col">
                      {child.href ? (
                        <Link
                          href={child.href}
                          {...linkProps(child)}
                          className="text-body-sm text-ink rounded-md px-2 py-2 font-medium"
                        >
                          {child.label}
                        </Link>
                      ) : (
                        <span className="text-label text-ink-subtle px-2 py-2 font-medium">
                          {child.label}
                        </span>
                      )}

                      {child.children.map((leaf) => (
                        <Link
                          key={leaf.id}
                          href={leaf.href ?? "#"}
                          {...linkProps(leaf)}
                          className="text-body-sm text-ink-muted rounded-md px-2 py-2 pl-4"
                        >
                          {leaf.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Container>
      </nav>
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */
