import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { pickableMedia } from "@/server/media/pickable";
import { findPopup, popupEditorOptions } from "@/server/popups/service";
import { popupState } from "@/lib/popups/rules";
import { formatIstDateTime } from "@/lib/dates/ist";
import { PopupForm } from "../popup-form";
import { PopupActiveSwitch, PopupRowActions } from "../popup-controls";

export const metadata: Metadata = {
  title: "Edit popup",
  robots: { index: false, follow: false },
};

const STATE = {
  live: { label: "Live", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  expired: { label: "Expired", tone: "warning" },
  inactive: { label: "Inactive", tone: "neutral" },
} as const;

export default async function EditPopupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("POPUPS", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;
  const query = await searchParams;

  const [popup, options, mediaOptions] = await Promise.all([findPopup(id), popupEditorOptions(), pickableMedia()]);
  if (!popup) notFound();

  const state = popupState(popup);

  return (
    <AdminPage>
      <AdminPageHeader
        title={popup.name}
        description={popup.heading}
        backHref="/admin/popups"
        backLabel="Back to popups"
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Badge tone={STATE[state].tone}>{STATE[state].label}</Badge>
            <PopupActiveSwitch id={popup.id} active={popup.active} name={popup.name} canPublish={can("POPUPS", "PUBLISH")} withLabel />
            <PopupRowActions
              id={popup.id}
              name={popup.name}
              canEdit={can("POPUPS", "EDIT")}
              canCreate={can("POPUPS", "CREATE")}
              canDelete={can("POPUPS", "DELETE")}
            />
          </div>
        }
      />

      {query.created === "1" ? (
        <p role="status" className="border-success-100 bg-success-50 text-success-700 text-body-sm rounded-md border p-3">
          Popup created. It is switched off until you turn it on.
        </p>
      ) : null}

      <PopupForm
        mode="edit"
        version={popup.updatedAt.toISOString()}
        options={options}
        mediaOptions={mediaOptions}
        readOnly={!can("POPUPS", "EDIT")}
        openPreview={query.preview === "1"}
        values={{
          id: popup.id,
          active: popup.active,
          name: popup.name,
          type: popup.type,
          eyebrow: popup.eyebrow ?? "",
          heading: popup.heading,
          description: popup.description ?? "",
          imageId: popup.imageId ?? "",
          productId: popup.productId ?? "",
          formId: popup.formId ?? "",
          ctaLabel: popup.ctaLabel ?? "",
          ctaHref: popup.ctaHref ?? "",
          trigger: popup.trigger,
          delaySeconds: String(popup.delaySeconds),
          scrollPercent: String(popup.scrollPercent),
          device: popup.device,
          frequencyDays: String(popup.frequencyDays),
          priority: String(popup.priority),
          startsAt: popup.startsAt ? formatIstDateTime(popup.startsAt) : "",
          endsAt: popup.endsAt ? formatIstDateTime(popup.endsAt) : "",
          targetMode: popup.targetMode,
          targetRules: popup.rules.join("\n"),
        }}
      />
    </AdminPage>
  );
}
