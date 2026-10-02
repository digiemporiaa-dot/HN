import { redirect } from "next/navigation";

import { requirePermission } from "@/server/permissions";

/** The SEO area opens on its first tool until it has more than one. */
export default async function SeoPage() {
  await requirePermission("SEO", "VIEW");
  redirect("/admin/seo/redirects");
}
