/**
 * Turns a video page URL into an embed URL.
 *
 * Editors paste the address from the browser bar, not an embed URL, so the id
 * is extracted here rather than asked for. Anything unrecognised returns null
 * and the section renders a link instead of an iframe: a silently broken
 * player is worse than an honest link.
 *
 * Both providers are addressed through their privacy-preserving hosts. A
 * hospital's procurement team looking at equipment should not be handed to an
 * advertising profile for doing so, and on a page that may be embedded in a
 * tender response that matters more than usual.
 */
export type VideoEmbed = {
  provider: "youtube" | "vimeo";
  embedUrl: string;
  title: string;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

export function parseVideoUrl(raw: string): VideoEmbed | null {
  const value = raw.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" && YOUTUBE_ID.test(segments[0] ?? "")) {
    return youtube(segments[0]);
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const queryId = url.searchParams.get("v") ?? "";
    if (YOUTUBE_ID.test(queryId)) return youtube(queryId);

    // /embed/ID and /shorts/ID
    if (
      (segments[0] === "embed" || segments[0] === "shorts") &&
      YOUTUBE_ID.test(segments[1] ?? "")
    ) {
      return youtube(segments[1]);
    }
  }

  if (host === "vimeo.com" && VIMEO_ID.test(segments[0] ?? "")) {
    return vimeo(segments[0]);
  }

  if (
    host === "player.vimeo.com" &&
    segments[0] === "video" &&
    VIMEO_ID.test(segments[1] ?? "")
  ) {
    return vimeo(segments[1]);
  }

  return null;
}

function youtube(id: string): VideoEmbed {
  return {
    provider: "youtube",
    // youtube-nocookie.com sets no tracking cookie until the viewer plays.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`,
    title: "YouTube video player",
  };
}

function vimeo(id: string): VideoEmbed {
  return {
    provider: "vimeo",
    // dnt=1 asks Vimeo not to track the session.
    embedUrl: `https://player.vimeo.com/video/${id}?dnt=1&autoplay=1`,
    title: "Vimeo video player",
  };
}
