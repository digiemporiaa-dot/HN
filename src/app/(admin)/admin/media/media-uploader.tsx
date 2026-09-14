"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

/**
 * Uploads one file at a time over XHR.
 *
 * XHR rather than fetch because it is still the only way to observe upload
 * progress; sequential rather than parallel so a batch of large brochures does
 * not saturate a slow connection and time everything out at once.
 */
export function MediaUploader({ folderId }: { folderId: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const uploadOne = (file: File, id: string) =>
    new Promise<void>((resolve) => {
      const body = new FormData();
      body.append("file", file);
      if (folderId) body.append("folderId", folderId);

      const request = new XMLHttpRequest();
      request.open("POST", "/api/media/upload");

      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        update(id, { progress: Math.round((event.loaded / event.total) * 100) });
      });

      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) {
          update(id, { progress: 100, status: "done" });
        } else {
          let message = "Upload failed.";
          try {
            message = JSON.parse(request.responseText).error ?? message;
          } catch {
            // Keep the generic message when the body is not JSON.
          }
          update(id, { status: "error", error: message });
        }
        resolve();
      });

      request.addEventListener("error", () => {
        update(id, { status: "error", error: "Network error during upload." });
        resolve();
      });

      request.send(body);
    });

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const queued: UploadItem[] = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      progress: 0,
      status: "uploading",
    }));

    setItems((current) => [...queued, ...current]);
    setBusy(true);

    for (const [index, file] of Array.from(fileList).entries()) {
      await uploadOne(file, queued[index].id);
    }

    setBusy(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "border-line flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          dragging && "border-primary bg-primary-subtle",
        )}
      >
        <UploadCloud aria-hidden="true" className="text-ink-subtle size-6" />
        <div className="flex flex-col gap-1">
          <p className="text-body-sm text-ink font-medium">
            Drop files here, or choose them
          </p>
          <p className="text-caption text-ink-subtle">
            JPG, PNG, WEBP, AVIF, GIF and SVG up to 10MB. PDF up to 25MB.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          accept=".jpg,.jpeg,.png,.webp,.avif,.gif,.svg,.pdf"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading" : "Choose files"}
        </Button>
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-line bg-surface flex items-center gap-3 rounded-md border px-3 py-2"
            >
              {item.status === "done" ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="text-success-600 size-4 shrink-0"
                />
              ) : item.status === "error" ? (
                <AlertCircle
                  aria-hidden="true"
                  className="text-danger-600 size-4 shrink-0"
                />
              ) : (
                <span className="text-caption text-ink-subtle w-9 shrink-0 tabular-nums">
                  {item.progress}%
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-body-sm text-ink truncate">{item.name}</p>
                {item.status === "uploading" ? (
                  <div
                    role="progressbar"
                    aria-valuenow={item.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Uploading ${item.name}`}
                    className="bg-surface-muted mt-1 h-1 w-full overflow-hidden rounded-full"
                  >
                    <div
                      className="bg-primary h-full transition-[width]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                ) : null}
                {item.error ? (
                  <p className="text-caption text-danger-600">{item.error}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
