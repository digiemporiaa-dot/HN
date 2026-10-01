import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { prisma } from "@/server/db";
import { PAGE_TEMPLATES } from "@/lib/cms/page-templates";
import { PageCreateForm } from "../[id]/page-forms";

export const metadata: Metadata = {
  title: "New page",
  robots: { index: false, follow: false },
};

export default async function NewPagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("PAGES", "CREATE");

  const { template } = await searchParams;
  const initialTemplate =
    PAGE_TEMPLATES.find((option) => option.key === template)?.key ?? "blank";

  // Templates whose usual address is already a page, so the form can say so
  // before the editor is refused for a clash.
  const taken = await prisma.page.findMany({
    where: {
      slug: {
        in: PAGE_TEMPLATES.map((option) => option.slug).filter(Boolean),
      },
    },
    select: { slug: true },
  });

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="New page"
        description="Pages start as a draft. Add sections next, then publish when the page is ready."
        backHref="/admin/pages"
        backLabel="Back to pages"
      />

      <Card>
        <CardContent>
          <PageCreateForm
            initialTemplate={initialTemplate}
            takenSlugs={taken.map((row) => row.slug)}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
