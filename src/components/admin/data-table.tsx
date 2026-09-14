import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Pagination } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { buildQueryHref } from "@/lib/utils/query";
import {
  BulkActionBar,
  ColumnVisibilityMenu,
  RowCheckbox,
  SelectAllCheckbox,
  SelectionProvider,
  SelectionSpacer,
  type BulkActionOption,
} from "./data-table-parts";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  /**
   * `primary` is the row's identity — always shown, and the heading of the
   * mobile card. `meta` columns are the first to be hidden on small screens.
   */
  priority?: "primary" | "secondary" | "meta";
  align?: "left" | "right";
  headerClassName?: string;
  cellClassName?: string;
};

export type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowId: (row: T) => string;
  rowLabel: (row: T) => string;
  rowHref?: (row: T) => string;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  total: number;
  page: number;
  pageSize: number;
  entityLabel: string;
  toolbar?: ReactNode;
  emptyState: ReactNode;
  bulkAction?: {
    action: (formData: FormData) => void | Promise<void>;
    options: BulkActionOption[];
  };
};

/**
 * Server-rendered table. Search, sorting, paging and column visibility all live
 * in the URL, so the server decides what to send and the browser never receives
 * more rows than it displays.
 */
export function DataTable<T>({
  columns,
  rows,
  rowId,
  rowLabel,
  rowHref,
  basePath,
  searchParams,
  total,
  page,
  pageSize,
  entityLabel,
  toolbar,
  emptyState,
  bulkAction,
}: DataTableProps<T>) {
  const hidden = new Set(
    String(searchParams.hide ?? "")
      .split(",")
      .filter(Boolean),
  );
  const sortKey = String(searchParams.sort ?? "");
  const sortDir = searchParams.dir === "desc" ? "desc" : "asc";

  const visibleColumns = columns.filter(
    (column) => column.priority === "primary" || !hidden.has(column.key),
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allIds = rows.map(rowId);
  const selectable = Boolean(bulkAction);

  const table = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">{toolbar}</div>
        <ColumnVisibilityMenu
          columns={columns.map((column) => ({
            key: column.key,
            header: column.header,
            locked: column.priority === "primary",
          }))}
        />
      </div>

      {rows.length === 0 ? (
        emptyState
      ) : (
        <>
          {/* Desktop: a real table. The header is sticky within its own scroll
              container, and carries an opaque background so rows never show
              through it. */}
          <div className="border-line bg-surface hidden overflow-hidden rounded-lg border md:block">
            <div className="max-h-[calc(100dvh-20rem)] overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface-subtle border-line border-b">
                    {selectable ? (
                      <th scope="col" className="w-12 px-4 py-3">
                        <SelectAllCheckbox />
                      </th>
                    ) : null}

                    {visibleColumns.map((column) => {
                      const isSorted = sortKey === column.key;
                      const nextDir =
                        isSorted && sortDir === "asc" ? "desc" : "asc";

                      return (
                        <th
                          key={column.key}
                          scope="col"
                          aria-sort={
                            isSorted
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : undefined
                          }
                          className={cn(
                            "text-label text-ink-muted px-4 py-3 font-medium whitespace-nowrap",
                            column.align === "right" && "text-right",
                            column.headerClassName,
                          )}
                        >
                          {column.sortable ? (
                            <Link
                              href={buildQueryHref(basePath, searchParams, {
                                sort: column.key,
                                dir: nextDir,
                                page: null,
                              })}
                              className="hover:text-ink inline-flex items-center gap-1.5 transition-colors"
                            >
                              {column.header}
                              {isSorted ? (
                                sortDir === "asc" ? (
                                  <ArrowUp aria-hidden="true" className="size-3.5" />
                                ) : (
                                  <ArrowDown aria-hidden="true" className="size-3.5" />
                                )
                              ) : (
                                <ArrowUpDown
                                  aria-hidden="true"
                                  className="size-3.5 opacity-40"
                                />
                              )}
                            </Link>
                          ) : (
                            column.header
                          )}
                        </th>
                      );
                    })}

                    {rowHref ? (
                      <th scope="col" className="w-24 px-4 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>

                <tbody className="divide-line divide-y">
                  {rows.map((row) => {
                    const id = rowId(row);
                    return (
                      <tr key={id} className="hover:bg-surface-subtle">
                        {selectable ? (
                          <td className="px-4 py-3 align-middle">
                            <RowCheckbox id={id} label={rowLabel(row)} />
                          </td>
                        ) : null}

                        {visibleColumns.map((column) => (
                          <td
                            key={column.key}
                            className={cn(
                              "text-body-sm text-ink-muted px-4 py-3 align-middle",
                              column.align === "right" && "text-right",
                              column.cellClassName,
                            )}
                          >
                            {column.cell(row)}
                          </td>
                        ))}

                        {rowHref ? (
                          <td className="px-4 py-3 text-right align-middle">
                            <Link
                              href={rowHref(row)}
                              className="text-primary hover:text-primary-hover text-body-sm font-medium"
                            >
                              Open
                              <span className="sr-only"> {rowLabel(row)}</span>
                            </Link>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: the same columns restacked as cards. A table squeezed into
              360px is unusable, and horizontal scrolling hides the columns that
              matter most. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => {
              const id = rowId(row);
              const primary = visibleColumns.find(
                (column) => column.priority === "primary",
              );
              const rest = visibleColumns.filter(
                (column) => column.priority !== "primary",
              );

              return (
                <li
                  key={id}
                  className="border-line bg-surface flex flex-col gap-3 rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    {selectable ? (
                      <span className="pt-0.5">
                        <RowCheckbox id={id} label={rowLabel(row)} />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      {primary ? primary.cell(row) : rowLabel(row)}
                    </div>
                  </div>

                  <dl className="flex flex-col gap-1.5">
                    {rest.map((column) => (
                      <div
                        key={column.key}
                        className="flex items-start justify-between gap-4"
                      >
                        <dt className="text-caption text-ink-subtle shrink-0">
                          {column.header}
                        </dt>
                        <dd className="text-body-sm text-ink-muted min-w-0 text-right">
                          {column.cell(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {rowHref ? (
                    <Link
                      href={rowHref(row)}
                      className="text-primary hover:text-primary-hover text-body-sm font-medium"
                    >
                      Open
                      <span className="sr-only"> {rowLabel(row)}</span>
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-caption text-ink-muted">
              Showing {(page - 1) * pageSize + 1}&ndash;
              {Math.min(page * pageSize, total)} of {total}
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              buildHref={(target) =>
                buildQueryHref(basePath, searchParams, { page: target })
              }
            />
          </div>
        </>
      )}
    </>
  );

  if (!bulkAction) {
    return <div className="flex flex-col gap-4">{table}</div>;
  }

  return (
    <SelectionProvider allIds={allIds}>
      <div className="flex flex-col gap-4">
        {table}
        <SelectionSpacer />
        <BulkActionBar
          action={bulkAction.action}
          options={bulkAction.options}
          entityLabel={entityLabel}
        />
      </div>
    </SelectionProvider>
  );
}
