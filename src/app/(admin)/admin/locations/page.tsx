import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";

import {
  Badge,
  buttonStyles,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  CITY_LIST_SELECT,
  cityPath,
  listStates,
  type CityRow,
} from "@/server/locations/service";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { readPageParam, readStringParam } from "@/lib/utils/query";
import { DeletedCities } from "./deleted-cities";

export const metadata: Metadata = {
  title: "Locations",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;
const STATUS_VALUES = new Set<string>(
  CONTENT_STATUS_OPTIONS.map((s) => s.value),
);

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("LOCATIONS", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const states = await listStates();

  // Filters are checked against what exists rather than passed through, so a
  // hand-edited URL cannot reach the query builder.
  const rawStatus = readStringParam(params.status);
  const rawState = readStringParam(params.state);
  const status =
    rawStatus && STATUS_VALUES.has(rawStatus) ? rawStatus : undefined;
  const stateId =
    rawState && states.some((state) => state.id === rawState)
      ? rawState
      : undefined;

  const where: Prisma.CityWhereInput = {
    deletedAt: null,
    ...(status ? { status: status as Prisma.CityWhereInput["status"] } : {}),
    ...(stateId ? { stateId } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, cities] = await Promise.all([
    prisma.city.count({ where }),
    prisma.city.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: CITY_LIST_SELECT,
    }) as Promise<CityRow[]>,
  ]);

  const filtered = Boolean(query || status || stateId);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Locations"
        description="States, and the cities with a page of their own. Each city is added on purpose and written by a person — never generated."
        actions={
          can("LOCATIONS", "CREATE") ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/locations/states/new"
                className={buttonStyles({ variant: "outline" })}
              >
                New state
              </Link>
              <Link
                href="/admin/locations/cities/new"
                className={buttonStyles({})}
              >
                <Plus aria-hidden="true" className="size-4" />
                New city
              </Link>
            </div>
          ) : null
        }
      />

      <DataTable
        rows={cities}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/locations/cities/${row.id}`}
        basePath="/admin/locations"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="city"
        toolbar={
          <>
            <TableSearch placeholder="Search city or slug" />
            <TableFilter
              paramName="state"
              label="Filter by state"
              allLabel="Any state"
              options={states.map((state) => ({
                value: state.id,
                label: state.name,
              }))}
            />
            <TableFilter
              paramName="status"
              label="Filter by status"
              allLabel="Any status"
              options={CONTENT_STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.short,
              }))}
            />
          </>
        }
        emptyState={
          <EmptyState
            icon={<MapPin aria-hidden="true" className="size-6" />}
            title={filtered ? "No matching cities" : "No cities yet"}
            description={
              filtered
                ? "Try a different search, or clear the filters."
                : states.length === 0
                  ? "Add the states first, then the cities you want a page for."
                  : "Add a city when there is something specific and true to say about serving it."
            }
          />
        }
        columns={[
          {
            key: "name",
            header: "City",
            cell: (row) => (
              <div className="flex flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row.name}
                </span>
                <span className="text-caption text-ink-muted">
                  {cityPath(row.slug)}
                </span>
              </div>
            ),
          },
          {
            key: "state",
            header: "State",
            priority: "meta",
            cell: (row) => row.state.name,
          },
          {
            key: "indexable",
            header: "Search",
            priority: "meta",
            cell: (row) =>
              row.indexable ? (
                <Badge tone="info">Indexed</Badge>
              ) : (
                <span className="text-ink-subtle">Not indexed</span>
              ),
          },
          {
            key: "status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.status} />,
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>States and union territories ({states.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {states.length === 0 ? (
            <p className="text-body-sm text-ink-muted">
              None yet. Add them one at a time, or load India&rsquo;s states and union
              territories with <code>npm run db:seed:states</code>.
            </p>
          ) : (
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {states.map((state) => (
                <li
                  key={state.id}
                  className="flex items-baseline justify-between gap-3"
                >
                  {/* Said in words rather than struck through: a line through a
                      name reads as deleted, and an inactive state is not. */}
                  <Link
                    href={`/admin/locations/states/${state.id}`}
                    className={
                      state.active
                        ? "text-body-sm text-ink hover:text-primary"
                        : "text-body-sm text-ink-subtle hover:text-primary"
                    }
                  >
                    {state.name}
                    {state.active ? "" : " (inactive)"}
                  </Link>
                  <span className="text-caption text-ink-subtle">
                    {state._count.cities > 0 ? state._count.cities : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DeletedCities canRestore={can("LOCATIONS", "EDIT")} />
    </AdminPage>
  );
}
