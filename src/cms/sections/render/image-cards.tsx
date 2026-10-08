import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SceneCard } from "@/components/site/cards";
import { SmartImage } from "@/components/site/media";
import { cn } from "@/lib/utils/cn";
import { gridCols, Intro, isDark, row, rows, Stack, type RendererProps } from "./shared";

/**
 * Hand-built image cards. "Image overlay" sets the words over the picture,
 * the way catalogue scene cards look; the other styles put them underneath.
 */
export function ImageCardsSection({ content, design, mediaById }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;
  const dark = isDark(design);

  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className={cn("reveal-stagger grid grid-cols-1 gap-5 lg:gap-6", gridCols(design.columns))}>
        {items.map((item, index) => {
          const image = mediaById[row(item, "image")] ?? null;
          const href = row(item, "linkHref");
          const title = row(item, "title");
          const body = row(item, "body");

          if (design.cardStyle === "overlay" && href) {
            return (
              <li key={index}>
                <SceneCard
                  kind="application"
                  data={{ name: title, href, summary: body || null, image }}
                  aspect="landscape"
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  cta={row(item, "linkLabel") || undefined}
                />
              </li>
            );
          }

          return (
            <li
              key={index}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border",
                dark ? "border-white/10 bg-white/[0.03]" : "border-line bg-surface shadow-[var(--shadow-card)]",
                href && "transition-[box-shadow,transform] duration-[var(--duration-slow)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
              )}
            >
              {image ? (
                <div className="media-frame zoom-media aspect-[4/3]">
                  <SmartImage src={image.url} alt={image.alt} sizes="(min-width: 1024px) 33vw, 100vw" />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col gap-2 p-6">
                <h3 className="text-h4 text-ink">
                  {href ? (
                    <Link href={href} className="after:absolute after:inset-0 after:rounded-[inherit]">
                      {title}
                    </Link>
                  ) : (
                    title
                  )}
                </h3>
                {body ? <p className="text-body-sm text-ink-muted">{body}</p> : null}
                {href && row(item, "linkLabel") ? (
                  <span className="text-body-sm text-primary mt-auto inline-flex items-center gap-2 pt-2 font-semibold">
                    {row(item, "linkLabel")}
                    <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Stack>
  );
}
