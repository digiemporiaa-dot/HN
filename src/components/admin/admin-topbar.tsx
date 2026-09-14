"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, UserCircle2, X } from "lucide-react";

import { Button } from "@/components/ui";
import { logoutAction } from "@/server/auth/actions";
import { siteConfig } from "@/lib/site-config";
import { AdminNavList, type VisibleNav } from "./admin-nav-list";

export function AdminTopBar({
  groups,
  staffName,
  staffEmail,
  roleName,
}: {
  groups: VisibleNav;
  staffName: string;
  staffEmail: string;
  roleName: string;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <header className="border-line bg-surface sticky top-0 z-30 border-b">
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={navOpen}
            className="text-ink hover:bg-surface-muted -ml-2 rounded-md p-2 transition-colors lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <span className="text-h4 font-display text-ink truncate lg:hidden">
            {siteConfig.name}
          </span>

          <div className="hidden lg:block" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              className="hover:bg-surface-muted flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors"
            >
              <UserCircle2
                aria-hidden="true"
                className="text-ink-muted size-6 shrink-0"
              />
              <span className="hidden flex-col items-start sm:flex">
                <span className="text-body-sm text-ink font-medium">
                  {staffName}
                </span>
                <span className="text-caption text-ink-subtle">{roleName}</span>
              </span>
            </button>

            {accountOpen ? (
              <>
                {/* Click-away target, kept behind the menu itself. */}
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setAccountOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  role="menu"
                  className="border-line bg-surface absolute right-0 z-20 mt-2 w-64 rounded-lg border p-1.5 shadow-lg"
                >
                  <div className="border-line border-b px-3 py-2.5">
                    <p className="text-body-sm text-ink truncate font-medium">
                      {staffName}
                    </p>
                    <p className="text-caption text-ink-muted truncate">
                      {staffEmail}
                    </p>
                  </div>

                  <Link
                    href="/admin/profile"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="text-body-sm text-ink hover:bg-surface-muted mt-1 flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors"
                  >
                    <UserCircle2 aria-hidden="true" className="size-4" />
                    My profile
                  </Link>

                  <form action={logoutAction} className="mt-0.5">
                    <button
                      type="submit"
                      role="menuitem"
                      className="text-body-sm text-danger-600 hover:bg-danger-50 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors"
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                      Sign out
                    </button>
                  </form>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile navigation. Rendered outside the header so it overlays cleanly. */}
      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="bg-navy-950/60 absolute inset-0"
          />
          <div className="bg-navy-950 absolute inset-y-0 left-0 flex w-[min(17rem,85vw)] flex-col overflow-y-auto">
            <div className="border-navy-800 flex items-center justify-between border-b px-4 py-4">
              <span className="text-h4 font-display text-white">
                {siteConfig.name}
              </span>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation"
                className="text-navy-200 hover:bg-navy-900 rounded-md p-1.5 transition-colors hover:text-white"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="flex-1 px-3">
              <AdminNavList
                groups={groups}
                onNavigate={() => setNavOpen(false)}
              />
            </div>

            <div className="border-navy-800 border-t p-4">
              <form action={logoutAction}>
                <Button type="submit" variant="outline" block size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
