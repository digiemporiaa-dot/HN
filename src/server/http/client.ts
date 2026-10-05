import { isIP } from "node:net";
import { headers } from "next/headers";

import { appUrl } from "@/lib/site-config";

/**
 * The visitor's address, as reported by the reverse proxy in front of us.
 *
 * X-Forwarded-For is a list each proxy appends to, and its first entries are
 * whatever the client chose to send — trusting the first one would let anyone
 * pick their own address and step around every per-address limit. The
 * entries we can trust are the last ones, added by proxies we run: one for
 * Coolify's proxy (the default), two with a CDN such as Cloudflare in front.
 * Set TRUSTED_PROXY_HOPS to the number of proxies.
 */
export function clientIpFrom(headerList: Headers): string | null {
  const hops = Math.min(
    Math.max(
      Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10) || 1,
      1,
    ),
    5,
  );
  const forwarded = headerList
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (forwarded && forwarded.length > 0) {
    const candidate = forwarded[Math.max(0, forwarded.length - hops)];
    if (isIP(candidate)) return candidate;
  }
  const real = headerList.get("x-real-ip")?.trim();
  return real && isIP(real) ? real : null;
}

export function userAgentFrom(headerList: Headers): string | null {
  return headerList.get("user-agent")?.slice(0, 512) ?? null;
}

/** Address and user agent of the current request, for audit and throttling. */
export async function requestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const headerList = await headers();
  return {
    ipAddress: clientIpFrom(headerList),
    userAgent: userAgentFrom(headerList),
  };
}

/**
 * Whether a state-changing request came from a page on this site. Browsers
 * always send Origin on a POST and a cross-site page cannot forge it, so a
 * missing or foreign one is a request staff did not make. Server actions get
 * this check from Next.js; route handlers that accept uploads call it.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (origin === new URL(appUrl()).origin) return true;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}
