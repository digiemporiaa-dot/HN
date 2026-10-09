"use client";

import { ChevronDown, ExternalLink, LogOut, PanelLeft, Plus, ShieldCheck, UserCircle2 } from "lucide-react";

import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui";
import { logoutAction } from "@/server/auth/actions";
import { AdminBreadcrumbs } from "./admin-breadcrumbs";
import { AdminSearch } from "./admin-search";
import { ThemeMenuItems, ThemeSwitch } from "./theme";
import { useHasUnsavedChanges } from "./navigation-guard";
import type { VisibleNav } from "./navigation";

/**
 * The sticky top bar. Its glass is a sibling layer behind the row, not the
 * row's parent: an element with a backdrop filter becomes the containing
 * block of fixed descendants, and the search sheet and menus must not be
 * trapped inside it.
 */
export function AdminTopBar({
  groups,
  createOptions,
  staffName,
  staffEmail,
  roleName,
  onOpenSidebar,
}: {
  groups: VisibleNav;
  createOptions: Array<{ label: string; href: string }>;
  staffName: string;
  staffEmail: string;
  roleName: string;
  onOpenSidebar: () => void;
}) {
  const dirty = useHasUnsavedChanges();
  const initials =
    staffName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <header className="topbar-fade sticky top-0 z-[30] px-3 pt-3 pb-3 sm:px-4 lg:pr-3 lg:pl-0">
      <div className="relative mx-auto max-w-[100rem]">
        <div aria-hidden="true" className="glass-bar pointer-events-none absolute inset-0 rounded-[18px] sm:rounded-[var(--admin-radius-shell)]" />
        <div className="relative flex h-14 items-center gap-1.5 px-2 sm:h-16 sm:gap-2 sm:px-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
            aria-controls="admin-sidebar"
            className="admin-focus-ring text-ink-muted hover:text-ink hover:bg-surface-muted flex size-9 shrink-0 items-center justify-center rounded-xl lg:hidden"
          >
            <PanelLeft aria-hidden="true" className="size-5" />
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-3 pl-2 lg:flex">
            <AdminBreadcrumbs groups={groups} />
            {dirty ? (
              <span role="status" className="bg-warning-50 text-warning-700 shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold">
                Unsaved<span className="sr-only"> changes</span>
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 lg:hidden" aria-hidden="true" />

          <div className="shrink-0 sm:w-56 lg:w-52 xl:w-64 2xl:w-80">
            <AdminSearch groups={groups} createOptions={createOptions} />
          </div>

          {createOptions.length > 0 ? (
            <Menu
              label="Create new"
              triggerClassName="rounded-[var(--admin-radius-control)]"
              trigger={
                <span className="bg-ink text-canvas hover:bg-secondary-hover inline-flex h-9 items-center gap-1.5 rounded-[var(--admin-radius-control)] px-2.5 text-[0.8125rem] font-medium shadow-sm transition-colors sm:px-3">
                  <Plus aria-hidden="true" className="size-4" />
                  <span className="hidden sm:inline">Create</span>
                  <ChevronDown aria-hidden="true" className="hidden size-3.5 opacity-70 sm:block" />
                </span>
              }
            >
              {createOptions.map((option) => (
                <MenuItem key={option.href} href={option.href} icon={<Plus />}>
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
          ) : null}

          <ThemeSwitch className="hidden min-[400px]:inline-flex" />

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View website (opens in a new tab)"
            title="View website"
            className="admin-focus-ring text-ink-muted hover:text-ink hover:bg-surface-muted hidden size-9 shrink-0 items-center justify-center rounded-xl sm:flex"
          >
            <ExternalLink aria-hidden="true" className="size-[1.05rem]" />
          </a>

          <Menu
            label="Account menu"
            triggerClassName="rounded-xl p-0.5"
            trigger={
              <span className="flex items-center gap-2.5">
                <span className="bg-primary text-primary-ink flex size-8 items-center justify-center rounded-full text-[0.75rem] font-semibold">
                  {initials}
                </span>
                <span className="hidden max-w-[10rem] flex-col items-start leading-tight xl:flex">
                  <span className="text-ink truncate text-[0.8125rem] font-medium">{staffName}</span>
                  <span className="text-ink-muted truncate text-[0.6875rem]">{roleName}</span>
                </span>
              </span>
            }
          >
            <div className="border-line border-b px-3 pt-1.5 pb-2.5">
              <p className="text-ink truncate text-[0.875rem] font-medium">{staffName}</p>
              <p className="text-ink-muted truncate text-[0.75rem]">{staffEmail}</p>
              <p className="text-ink-muted truncate text-[0.75rem]">{roleName}</p>
            </div>
            <div className="pt-1">
              <MenuItem href="/admin/profile" icon={<UserCircle2 />}>
                My profile
              </MenuItem>
              <MenuItem href="/admin/profile#security" icon={<ShieldCheck />}>
                Security
              </MenuItem>
            </div>
            <MenuSeparator />
            <MenuLabel>Appearance</MenuLabel>
            <ThemeMenuItems />
            <MenuSeparator />
            <MenuItem href="/" external icon={<ExternalLink />}>
              View website
            </MenuItem>
            <MenuSeparator />
            <form action={logoutAction}>
              <MenuItem tone="danger" icon={<LogOut />} submit>
                Sign out
              </MenuItem>
            </form>
          </Menu>
        </div>
      </div>
      <div className="px-2 pt-2.5 lg:hidden">
        <AdminBreadcrumbs groups={groups} />
      </div>
    </header>
  );
}
