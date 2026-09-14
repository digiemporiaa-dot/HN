import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="surface-light flex min-h-dvh flex-col">
      <header className="px-[var(--gutter)] py-6">
        <Link href="/" className="text-h4 font-display text-ink">
          {siteConfig.name}
        </Link>
      </header>

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-[var(--gutter)] py-10"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-[var(--gutter)] py-6">
        <p className="text-caption text-ink-subtle">
          &copy; {new Date().getFullYear()} {siteConfig.name}. Staff access only.
        </p>
      </footer>
    </div>
  );
}
