import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge cannot tell a custom `text-*` font-size token from a custom
 * `text-*` colour token, so without this it treats `text-h1` and `text-ink` as
 * conflicting and silently drops the first one — headings then render at body
 * size. Every font-size token in tokens.css must be listed here.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-1",
            "display-2",
            "h1",
            "h2",
            "h3",
            "h4",
            "body-lg",
            "body",
            "body-sm",
            "caption",
            "label",
            "overline",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
