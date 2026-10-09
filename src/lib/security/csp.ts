/**
 * Content-Security-Policy for the two halves of the site.
 *
 * Staff screens are rendered per request, so they get the strict policy: a
 * fresh nonce on every response and 'strict-dynamic', so only scripts this
 * application emitted can run. An injected <script> — the attack CSP exists
 * for — is refused even if some text field forgets to escape.
 *
 * Public pages are prerendered and cached, and a cached page cannot carry a
 * per-request nonce. They get an allow-list instead: scripts from this
 * origin (inline ones included, which Next.js's own bootstrap needs) and the
 * analytics hosts, nothing else. Plugins, <base> rewriting, and posting forms
 * elsewhere are refused on both.
 *
 * Kept free of Node imports: the middleware builds these on every request.
 */

const isDev = process.env.NODE_ENV !== "production";

/** Only over HTTPS: on http://localhost it would break every asset. */
function upgrade(): string[] {
  return (process.env.APP_URL ?? "").startsWith("https://")
    ? ["upgrade-insecure-requests"]
    : [];
}

const VIDEO_FRAMES = [
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
];

const ANALYTICS_SCRIPTS = ["https://www.googletagmanager.com"];
const ANALYTICS_CONNECT = [
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
];

function serialise(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function publicPolicy(): string {
  return serialise({
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...ANALYTICS_SCRIPTS,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...ANALYTICS_CONNECT],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...ANALYTICS_CONNECT],
    "frame-src": [...VIDEO_FRAMES, "https://www.googletagmanager.com"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
    ...Object.fromEntries(upgrade().map((name) => [name, []])),
  });
}

export function staffPolicy(nonce: string): string {
  return serialise({
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Inline style attributes are how components set computed sizes.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    // Section previews in the page editor embed the same players.
    "frame-src": ["'self'", ...VIDEO_FRAMES],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...Object.fromEntries(upgrade().map((name) => [name, []])),
  });
}

/** Paths rendered per request for staff: the admin, sign-in and password screens. */
export function isStaffPath(pathname: string): boolean {
  return /^\/(admin|login|change-password|forgot-password|reset-password|access-denied)(\/|$)/.test(pathname);
}
