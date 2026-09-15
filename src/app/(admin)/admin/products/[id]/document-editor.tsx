"use client";

import { useActionState, useState } from "react";
import { FileText, Plus } from "lucide-react";

import { Button, Checkbox, Input, Modal, Select } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RowControls, moveItem } from "@/components/admin/row-controls";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { DOCUMENT_KINDS } from "@/lib/validation/product-info";
import type { InfoActionState } from "@/server/products/info-actions";
import type { DocumentOption } from "@/server/products/info-service";

export type DocumentRow = {
  mediaId: string;
  title: string;
  kind: string;
  gated: boolean;
};

type InfoAction = (
  previous: InfoActionState,
  formData: FormData,
) => Promise<InfoActionState>;

const INITIAL: InfoActionState = {};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * The files attached to a product: brochures, manuals, certificates.
 *
 * Each row carries its own title because an uploaded filename
 * ("HN-2291_rev4_final.pdf") is rarely what a buyer should be asked to click,
 * and its own gated flag because whether a file is worth an enquiry is a
 * decision per document rather than per product.
 */
export function DocumentEditor({
  productId,
  documents: initial,
  version,
  options,
  saveAction,
  readOnly,
}: {
  productId: string;
  documents: DocumentRow[];
  version: string;
  options: DocumentOption[];
  saveAction: InfoAction;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAction, INITIAL);
  const [rows, setRows] = useSyncedState(initial, version);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const byId = new Map(options.map((option) => [option.id, option]));

  const update = (index: number, next: Partial<DocumentRow>) =>
    setRows((current) =>
      current.map((row, position) =>
        position === index ? { ...row, ...next } : row,
      ),
    );

  const needle = query.trim().toLowerCase();
  const chosen = new Set(rows.map((row) => row.mediaId));
  const available = options.filter(
    (option) =>
      !chosen.has(option.id) &&
      (!needle ||
        option.name.toLowerCase().includes(needle) ||
        option.fileName.toLowerCase().includes(needle)),
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="documents" value={JSON.stringify(rows)} />

      <FormFeedback state={state} />

      {rows.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-6 text-center">
          No documents yet. Upload PDFs from Media, then attach them here.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const file = byId.get(row.mediaId);
            return (
              <li
                key={row.mediaId}
                className="border-line flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <FileText
                    aria-hidden="true"
                    className="text-ink-subtle mt-2.5 size-5 shrink-0"
                  />
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[2fr_1fr]">
                    <Input
                      value={row.title}
                      disabled={readOnly}
                      placeholder="Title shown to visitors"
                      aria-label={`Title for ${file?.fileName ?? "document"}`}
                      onChange={(event) =>
                        update(index, { title: event.target.value })
                      }
                    />
                    <Select
                      value={row.kind}
                      disabled={readOnly}
                      aria-label={`Type of ${row.title || file?.fileName || "document"}`}
                      onChange={(event) =>
                        update(index, { kind: event.target.value })
                      }
                    >
                      {DOCUMENT_KINDS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <RowControls
                    label={
                      row.title || file?.fileName || `document ${index + 1}`
                    }
                    index={index}
                    count={rows.length}
                    disabled={readOnly}
                    onMove={(offset) =>
                      setRows((current) => moveItem(current, index, offset))
                    }
                    onRemove={() =>
                      setRows((current) =>
                        current.filter((_, position) => position !== index),
                      )
                    }
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pl-8">
                  <span className="text-caption text-ink-subtle truncate">
                    {file
                      ? `${file.fileName} · ${formatSize(file.sizeBytes)}`
                      : "This file is no longer in the library."}
                  </span>
                  <label className="text-body-sm text-ink flex items-center gap-2.5">
                    <Checkbox
                      checked={row.gated}
                      disabled={readOnly}
                      onChange={(event) =>
                        update(index, { gated: event.target.checked })
                      }
                    />
                    Ask for contact details before download
                  </label>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            Save documents
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Attach a file
          </Button>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Attach a document"
        description="Only files already uploaded to the library can be attached. Upload new files from Media."
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by file name"
            aria-label="Search documents"
          />

          {available.length === 0 ? (
            <p className="text-body-sm text-ink-muted py-6 text-center">
              {options.length === 0
                ? "There are no documents in the library yet. Upload a PDF from Media first."
                : "Every matching document is already attached."}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {available.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setRows((current) => [
                        ...current,
                        {
                          mediaId: option.id,
                          // Seeded from the library title so the common case
                          // needs no typing, and editable because the common
                          // case is not every case.
                          title: option.name,
                          kind: "BROCHURE",
                          gated: false,
                        },
                      ]);
                      setOpen(false);
                    }}
                    className="border-line hover:border-line-strong flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors"
                  >
                    <FileText
                      aria-hidden="true"
                      className="text-ink-subtle size-4 shrink-0"
                    />
                    <span className="text-body-sm text-ink min-w-0 flex-1 truncate">
                      {option.name}
                    </span>
                    <span className="text-caption text-ink-subtle shrink-0">
                      {formatSize(option.sizeBytes)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </form>
  );
}
