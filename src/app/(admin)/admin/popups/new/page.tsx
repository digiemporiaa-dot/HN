import type { Metadata } from "next";

import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { popupEditorOptions } from "@/server/popups/service";
import { NEW_POPUP, PopupForm } from "../popup-form";

export const metadata: Metadata = {
  title: "New popup",
  robots: { index: false, follow: false },
};

export default async function NewPopupPage() {
  await requirePermission("POPUPS", "CREATE");
  const [options, mediaOptions] = await Promise.all([popupEditorOptions(), pickableMedia()]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="New popup"
        description="Saved switched off. Check the preview, then switch it on from the list or this popup's page."
        backHref="/admin/popups"
        backLabel="Back to popups"
      />
      <PopupForm mode="create" version="new" values={NEW_POPUP} options={options} mediaOptions={mediaOptions} readOnly={false} />
    </AdminPage>
  );
}
