import type { Metadata } from "next";

import { RenderedSections } from "@/cms/render-page";
import {
  publishedHomeSections,
  starterHomeForRender,
} from "@/server/cms/homepage";

/**
 * Rebuilt at most every five minutes as well as on every homepage save.
 *
 * The homepage's own edits revalidate it directly, but its grids show
 * catalogue records whose own saves do not know the homepage exists. A short
 * interval keeps a withdrawn product from lingering here for long without
 * making every catalogue save responsible for every page that might show it.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  // The site's default title and description, from the settings, untemplated.
  alternates: { canonical: "/" },
};

/**
 * The homepage.
 *
 * The published "home" page when there is one; otherwise the starter, built
 * from the settings and the catalogue, so a fresh install has a working front
 * page rather than a placeholder.
 */
export default async function HomePage() {
  const sections =
    (await publishedHomeSections()) ?? (await starterHomeForRender());

  return <RenderedSections sections={sections} />;
}
