"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopBar } from "./admin-topbar";
import { AdminThemeProvider } from "./theme";
import { NavigationGuard } from "./navigation-guard";
import type { VisibleNav } from "./navigation";

const COLLAPSED_KEY = "hn:admin:nav-collapsed";

/**
 * The admin's client frame: theme, rail, top bar and the unsaved-changes
 * guard around every screen.
 *
 * The scope class goes on <body> too while the admin is mounted, so
 * anything portalled there (tooltips, the search sheet, popovers) is themed;
 * it comes off again on the way out, so the public site never carries it.
 */
export function AdminFrame({
  groups,
  createOptions,
  companyName,
  staffName,
  staffEmail,
  roleName,
  children,
}: {
  groups: VisibleNav;
  createOptions: Array<{ label: string; href: string }>;
  companyName: string;
  staffName: string;
  staffEmail: string;
  roleName: string;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // expanded
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.body.classList.add("admin-ui");
    return () => document.body.classList.remove("admin-ui");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // not remembered
      }
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  // Server and first client render use the expanded width.
  const isCollapsed = ready && collapsed;

  return (
    <AdminThemeProvider>
      <div className="admin-ui bg-canvas relative isolate min-h-dvh">
        <div className="admin-ambient" aria-hidden="true" />
        <NavigationGuard mainId="main">
          <AdminSidebar
            groups={groups}
            companyName={companyName}
            open={sidebarOpen}
            onClose={closeSidebar}
            collapsed={isCollapsed}
            onToggleCollapsed={toggleCollapsed}
          />
          <div className={cn("min-w-0 transition-[padding] duration-200 ease-out", isCollapsed ? "lg:pl-[6.25rem]" : "lg:pl-[17.5rem]")}>
            <AdminTopBar
              groups={groups}
              createOptions={createOptions}
              staffName={staffName}
              staffEmail={staffEmail}
              roleName={roleName}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
            <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[100rem] min-w-0 outline-none lg:pr-3">
              {children}
            </main>
          </div>
        </NavigationGuard>
      </div>
    </AdminThemeProvider>
  );
}
