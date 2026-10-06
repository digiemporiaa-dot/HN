import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { PostForm } from "../post-form";

export const metadata: Metadata = {
  title: "New post",
  robots: { index: false, follow: false },
};

export default async function NewPostPage() {
  await requirePermission("BLOGS", "CREATE");
  const { staff } = await currentPermissions();
  const media = await pickableMedia();

  return (
    <AdminPage>
      <AdminPageHeader
        title="New post"
        description="Start with the title and summary; the article itself is written in sections on the next screen."
        backHref="/admin/blogs"
        backLabel="Back to blog"
      />
      <Card>
        <CardContent>
          <PostForm
            mode="create"
            media={media}
            initial={{
              title: "",
              slug: "",
              excerpt: "",
              authorName: staff.name,
              coverId: "",
              featured: false,
              status: "DRAFT",
            }}
          />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
