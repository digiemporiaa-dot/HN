import NextAuth from "next-auth";

import { authConfig } from "@/server/auth/config";

/**
 * Fast redirect for unauthenticated visitors to /admin. This runs on the edge
 * and only inspects the session cookie — the real authorisation decision is
 * made server-side against the database in every admin layout and action.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*"],
};
