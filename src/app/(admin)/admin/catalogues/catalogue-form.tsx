"use client";

import { useActionState, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import {
  createCatalogueAction,
  updateCatalogueAction,
  type CatalogueActionState,
} from "@/server/catalogues/actions";
import { MediaPicker, type MediaOption } from "@/components/admin/sections/field-inputs";

const INITIAL: CatalogueActionState = {};

export type CatalogueFormValues = {
  id?: string;
  title: string;
  description: string;
  fileId: string;
  coverId: string;
  gated: boolean;
  status: string;
};

export type FileOption = { id: string; name: string };

/**
 * A catalogue: its PDF, a cover and whether the download asks for details
 * first. The PDF can be chosen from the media library or uploaded here, which
 * puts it in the library too.
 */
export function CatalogueForm({
  mode,
  values,
  version,
  files,
  mediaOptions,
  canPublish,
  canUpload,
  readOnly,
}: {
  mode: "create" | "edit";
  values: CatalogueFormValues;
  version: string;
  files: FileOption[];
  mediaOptions: MediaOption[];
  canPublish: boolean;
  canUpload: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createCatalogueAction : updateCatalogueAction,
    INITIAL,
  );
  const [form, setForm] = useSyncedState(values, version);
  const [fileOptions, setFileOptions] = useState(files);
  const [upload, setUpload] = useState<{ progress: number; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CatalogueFormValues>(key: K, value: CatalogueFormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const uploadPdf = (file: File) => {
    if (file.type && file.type !== "application/pdf") {
      setUpload({ progress: 0, error: "Choose a PDF file." });
      return;
    }
    const body = new FormData();
    body.append("file", file);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/media/upload");
    setUpload({ progress: 0 });
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) setUpload({ progress: Math.round((event.loaded / event.total) * 100) });
    });
    request.addEventListener("load", () => {
      let payload: { id?: string; error?: string } = {};
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        // Keep the generic message when the body is not JSON.
      }
      if (request.status >= 200 && request.status < 300 && payload.id) {
        const option = { id: payload.id, name: file.name };
        setFileOptions((current) => [option, ...current]);
        set("fileId", payload.id);
        if (!form.title) set("title", file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim());
        setUpload(null);
      } else {
        setUpload({ progress: 0, error: payload.error ?? "Upload failed." });
      }
    });
    request.addEventListener("error", () => setUpload({ progress: 0, error: "Upload failed. Check the connection and try again." }));
    request.send(body);
  };

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? <input type="hidden" name="catalogueId" value={values.id} /> : null}
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title" required error={state.fieldErrors?.title} className="md:col-span-2">
          {(control) => (
            <Input
              name="title"
              value={form.title}
              disabled={readOnly}
              maxLength={160}
              placeholder="Open and laparoscopy instruments"
              onChange={(event) => set("title", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="PDF file"
          required
          error={state.fieldErrors?.fileId ?? upload?.error}
          help="Choose a PDF already in the media library, or upload a new one."
          className="md:col-span-2"
        >
          {(control) => (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 sm:flex-1">
                <Select
                  name="fileId"
                  value={form.fileId}
                  disabled={readOnly}
                  onChange={(event) => set("fileId", event.target.value)}
                  {...control}
                >
                  <option value="">Choose a PDF</option>
                  {fileOptions.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name}
                    </option>
                  ))}
                </Select>
              </div>
              {canUpload && !readOnly ? (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadPdf(file);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={upload !== null && !upload.error}
                    onClick={() => inputRef.current?.click()}
                  >
                    <UploadCloud aria-hidden="true" className="size-4" />
                    {upload && !upload.error ? `Uploading… ${upload.progress}%` : "Upload PDF"}
                  </Button>
                </>
              ) : null}
            </div>
          )}
        </Field>

        <Field
          label="Description"
          help="One or two lines on the card: what the catalogue covers."
          error={state.fieldErrors?.description}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              name="description"
              value={form.description}
              disabled={readOnly}
              rows={3}
              maxLength={600}
              onChange={(event) => set("description", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field label="Cover image" help="Optional. The front page of the catalogue works well." error={state.fieldErrors?.coverId}>
          {(control) => (
            <>
              <input type="hidden" name="coverId" value={form.coverId} />
              <MediaPicker
                value={form.coverId}
                options={mediaOptions}
                onChange={(next) => set("coverId", next)}
                disabled={readOnly}
                control={control}
              />
            </>
          )}
        </Field>

        <Field label="Status" help={canPublish ? undefined : "You cannot publish catalogues."}>
          {(control) => (
            <Select
              name="status"
              value={form.status}
              disabled={readOnly}
              onChange={(event) => set("status", event.target.value)}
              {...control}
            >
              {CONTENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} disabled={option.value === "PUBLISHED" && !canPublish}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <label className="text-body-sm text-ink flex items-start gap-2.5">
        <Checkbox
          name="gated"
          checked={form.gated}
          disabled={readOnly}
          onChange={(event) => set("gated", event.target.checked)}
        />
        <span>
          Ask for the visitor&rsquo;s details before the download
          <span className="text-ink-muted block text-[0.8125rem]">
            The download form opens first and each download is saved as a lead. The fields it asks for are set under
            Content › CTA popups (Download catalogue). Untick to let anyone download directly.
          </span>
        </span>
      </label>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create catalogue" : "Save catalogue"}
          </Button>
        </div>
      )}
    </form>
  );
}
