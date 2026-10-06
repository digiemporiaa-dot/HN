import Link from "next/link";

import { Card, CardContent } from "@/components/ui";
import type { PostCardData } from "@/server/blog/public";

/* eslint-disable @next/next/no-img-element -- cover images are served from
   our own media route at their stored size. */

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "long",
  timeZone: "Asia/Kolkata",
});

export function formatPostDate(date: Date | null): string | null {
  return date ? dateFormatter.format(date) : null;
}

/** One article in a list: the blog index and "more articles". */
export function PostCard({ post }: { post: PostCardData }) {
  const date = formatPostDate(post.publishedAt);
  return (
    <Card as="li" interactive className="flex flex-col overflow-hidden">
      <Link href={`/blog/${post.slug}`} className="group flex flex-1 flex-col">
        {post.cover ? (
          <img
            src={post.cover.url}
            alt={post.cover.alt}
            loading="lazy"
            className="bg-surface-muted aspect-video w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="bg-surface-muted aspect-video w-full"
          />
        )}
        <CardContent className="flex flex-1 flex-col gap-1.5 p-4">
          {date || post.authorName ? (
            <span className="text-caption text-ink-subtle">
              {[date, post.authorName].filter(Boolean).join(" · ")}
            </span>
          ) : null}
          <span className="text-body text-ink group-hover:text-primary font-medium transition-colors">
            {post.title}
          </span>
          {post.excerpt ? (
            <span className="text-body-sm text-ink-muted line-clamp-3">
              {post.excerpt}
            </span>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  );
}

/* eslint-enable @next/next/no-img-element */
