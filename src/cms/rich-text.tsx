import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Renders the constrained rich-text syntax as React elements.
 *
 * Deliberately not HTML. Storing editor-produced markup would mean sanitising
 * it correctly on every read, and a single gap there is stored XSS on a public
 * page. Building React nodes from a small syntax means there is no HTML string
 * anywhere in the path, so nothing can be injected in the first place.
 *
 * Supported: blank-line paragraphs, **bold**, *italic*, [text](href).
 */

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:\/[^\s)]*|https:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\))/g;

const LINK_PATTERN = /^\[([^\]]+)\]\((.+)\)$/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_PATTERN).filter((part) => part !== "");

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    const link = LINK_PATTERN.exec(part);
    if (link) {
      const [, label, href] = link;
      // The pattern above only matches safe schemes, so href is already
      // constrained; external links additionally get rel protection.
      const external = href.startsWith("https://");
      return external ? (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
        >
          {label}
        </a>
      ) : (
        <Link
          key={key}
          href={href}
          className="text-primary underline underline-offset-4"
        >
          {label}
        </Link>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

export function RichText({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? "mt-4" : undefined}>
          {renderInline(paragraph, `p${index}`)}
        </p>
      ))}
    </div>
  );
}
