import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, Trash2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { findState } from "@/server/locations/service";
import { deleteStateAction } from "@/server/locations/actions";
import { StateForm } from "../../state-form";

export const metadata: Metadata = {
  title: "Edit state",
  robots: { index: false, follow: false },
};

export default async function EditStatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("LOCATIONS", "VIEW");
  const { can } = await currentPermissions();

  const { id } = await params;
  const { error } = await searchParams;
  const state = await findState(id);
  if (!state) notFound();

  return (
    <AdminPage>
      <AdminPageHeader
        title={state.name}
        description={
          state.kind === "UNION_TERRITORY" ? "Union territory" : "State"
        }
        backHref="/admin/locations"
        backLabel="Back to locations"
        actions={
          can("LOCATIONS", "DELETE") ? (
            <form action={deleteStateAction}>
              <input type="hidden" name="stateId" value={state.id} />
              <Button type="submit" variant="outline" size="sm">
                <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
                Delete
              </Button>
            </form>
          ) : null
        }
      />

      {error === "has-cities" ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Cities are still filed under this state, including recently deleted
            ones. Move each to another state first — restoring a deleted one if
            need be — or mark this state inactive, which hides it without
            touching its cities.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <StateForm
            mode="edit"
            version={state.updatedAt.toISOString()}
            readOnly={!can("LOCATIONS", "EDIT")}
            values={{
              id: state.id,
              name: state.name,
              slug: state.slug,
              code: state.code ?? "",
              kind: state.kind,
              active: state.active,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cities ({state.cities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {state.cities.length === 0 ? (
            <EmptyState
              title="No cities yet"
              description="Cities are added from the locations screen and filed under a state."
            />
          ) : (
            <ul className="divide-line divide-y">
              {state.cities.map((city) => (
                <li
                  key={city.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <Link
                    href={`/admin/locations/cities/${city.id}`}
                    className="text-body-sm text-ink hover:text-primary font-medium"
                  >
                    {city.name}
                  </Link>
                  <StatusBadge status={city.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
