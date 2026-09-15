"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";

import { Button, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { MediaOption } from "@/app/(admin)/admin/pages/[id]/field-inputs";

/* eslint-disable @next/next/no-img-element -- gallery thumbnails are served
   from our own media route at their stored size. */

/**
 * An ordered list of images.
 *
 * Order matters — the first image is what a listing shows — so this is a list
 * with explicit move controls rather than a set of checkboxes. The order is
 * held in state and posted as JSON, because form encoding has no way to express
 * a sequence.
 */
export function GalleryPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string[];
  options: MediaOption[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const byId = new Map(options.map((option) => [option.id, option]));
  const chosen = value.flatMap((id) => {
    const option = byId.get(id);
    return option ? [option] : [];
  });

  const needle = query.trim().toLowerCase();
  const available = options.filter(
    (option) =>
      !value.includes(option.id) &&
      (!needle || option.name.toLowerCase().includes(needle)),
  );

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* The whole sequence is posted from state, so nothing depends on which
          thumbnails happen to be rendered. */}
      <input type="hidden" name="galleryIds" value={JSON.stringify(value)} />

      {chosen.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-4">
          No gallery images yet. The first image is the one listings show.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {chosen.map((option, index) => (
            <li
              key={option.id}
              className="border-line bg-surface flex items-center gap-3 rounded-md border p-2"
            >
              <img
                src={option.url}
                alt=""
                loading="lazy"
                className="bg-surface-muted size-12 shrink-0 rounded-xs object-contain"
              />
              <span className="text-body-sm text-ink min-w-0 flex-1 truncate">
                {option.name}
                {index === 0 ? (
                  <span className="text-caption text-ink-subtle ml-2">
                    shown in listings
                  </span>
                ) : null}
              </span>

              {disabled ? null : (
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${option.name} earlier`}
                  >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === chosen.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${option.name} later`}
                  >
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange(value.filter((id) => id !== option.id))
                    }
                    aria-label={`Remove ${option.name} from the gallery`}
                  >
                    <Trash2
                      aria-hidden="true"
                      className="text-danger-600 size-4"
                    />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {disabled ? null : (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <ImagePlus aria-hidden="true" className="size-4" />
            Add images
          </Button>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add gallery images"
        description="Only files already uploaded to the library can be used. Upload new files from Media."
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by file name"
            aria-label="Search media"
          />

          {available.length === 0 ? (
            <p className="text-body-sm text-ink-muted py-6 text-center">
              {options.length === 0
                ? "The media library is empty. Upload a file from Media first."
                : "Every matching image is already in the gallery."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {available.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => onChange([...value, option.id])}
                    className={cn(
                      "border-line hover:border-line-strong flex w-full flex-col gap-1.5 rounded-md border p-2 text-left transition-colors",
                    )}
                  >
                    <img
                      src={option.url}
                      alt=""
                      loading="lazy"
                      className="bg-surface-muted h-20 w-full rounded-xs object-contain"
                    />
                    <span className="text-caption text-ink-muted truncate">
                      {option.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */
