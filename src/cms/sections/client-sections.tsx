"use client";

import { useState, type ReactNode } from "react";
import { Play } from "lucide-react";

import { Modal } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { ResolvedMedia } from "@/cms/render-page";
import type { VideoEmbed } from "@/cms/video";

/* eslint-disable @next/next/no-img-element -- CMS images are served from our own
   media route at their stored size; Next/Image would re-encode files we
   deliberately store untouched. */

/**
 * A video that loads nothing from the provider until someone asks for it.
 *
 * The poster and a play button stand in for the iframe, so a page carrying a
 * product video costs no third-party request — and sets no third-party cookie —
 * for the majority of visitors who never press play.
 */
export function VideoFacade({
  embed,
  poster,
  label,
}: {
  embed: VideoEmbed;
  poster: ResolvedMedia | null;
  label: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="bg-ink relative aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={embed.embedUrl}
          title={label || embed.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group bg-ink relative block aspect-video w-full overflow-hidden rounded-lg"
    >
      {poster ? (
        <img
          src={poster.url}
          alt={poster.alt}
          className="absolute inset-0 size-full object-cover opacity-80 transition-opacity group-hover:opacity-60"
        />
      ) : null}

      <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span className="bg-surface/90 group-hover:bg-surface flex size-16 items-center justify-center rounded-full transition-colors">
          <Play aria-hidden="true" className="text-primary ml-1 size-7" />
        </span>
        <span className="text-body-sm rounded-full bg-black/60 px-3 py-1 font-medium text-white">
          {label ? `Play — ${label}` : "Play video"}
        </span>
      </span>
    </button>
  );
}

export type GalleryItem = {
  media: ResolvedMedia;
  caption: string;
};

/**
 * A grid of images, each openable at full size.
 *
 * Equipment photographs are looked at closely — a control panel, a mounting
 * arm — so a thumbnail grid with no way to enlarge is not much use.
 */
export function GalleryGrid({
  items,
  columns,
}: {
  items: GalleryItem[];
  columns: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : items[openIndex];

  return (
    <>
      <ul
        className={cn(
          "grid grid-cols-2 gap-4",
          columns === "2" && "sm:grid-cols-2",
          columns === "4" && "sm:grid-cols-3 lg:grid-cols-4",
          (columns === "3" || !columns) && "sm:grid-cols-3",
        )}
      >
        {items.map((item, index) => (
          <li key={`${item.media.url}-${index}`}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="border-line hover:border-line-strong block w-full overflow-hidden rounded-md border transition-colors"
              aria-label={
                item.caption
                  ? `Enlarge: ${item.caption}`
                  : `Enlarge image ${index + 1}`
              }
            >
              <img
                src={item.media.url}
                alt={item.media.alt}
                loading="lazy"
                className="bg-surface-muted aspect-4/3 w-full object-cover"
              />
              {item.caption ? (
                <span className="text-caption text-ink-muted block p-2 text-left">
                  {item.caption}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={open !== null}
        onClose={() => setOpenIndex(null)}
        title={open?.caption || "Image"}
        size="lg"
      >
        {open ? (
          <figure className="flex flex-col gap-3">
            <img
              src={open.media.url}
              alt={open.media.alt}
              className="bg-surface-muted max-h-[70vh] w-full rounded-md object-contain"
            />
            {open.caption ? (
              <figcaption className="text-body-sm text-ink-muted">
                {open.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </Modal>
    </>
  );
}

export type TabPanel = {
  label: string;
  /**
   * Rendered on the server and handed over as elements.
   *
   * A render function cannot cross this boundary — props to a client component
   * are serialised — and rich text is markup the server already knows how to
   * produce.
   */
  content: ReactNode;
};

/**
 * Tabbed panels.
 *
 * The panels are all in the DOM and hidden rather than unmounted, so a browser
 * find, a screen reader's document mode and a print stylesheet can all still
 * reach content that is not the open tab.
 */
export function TabbedPanels({ items }: { items: TabPanel[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Sections"
        className="border-line flex gap-1 overflow-x-auto border-b"
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const next =
            event.key === "ArrowRight"
              ? (active + 1) % items.length
              : (active - 1 + items.length) % items.length;
          setActive(next);
          const tabs =
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="tab"]',
            );
          tabs[next]?.focus();
        }}
      >
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            id={`cms-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`cms-tabpanel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            className={cn(
              "text-body-sm -mb-px shrink-0 border-b-2 px-4 py-3 font-medium transition-colors",
              index === active
                ? "border-primary text-ink"
                : "text-ink-muted hover:text-ink border-transparent",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`cms-tabpanel-${index}`}
          aria-labelledby={`cms-tab-${index}`}
          hidden={index !== active}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */
