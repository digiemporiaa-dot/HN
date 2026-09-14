import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * Middleware runs on the edge runtime, where Prisma and bcrypt cannot load, so
 * the provider list is deliberately empty here and the credentials provider is
 * added in the Node-only module. Everything in this file must stay free of
 * database and Node built-in imports.
 */
export const authConfig = {
  providers: [],
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    // Credentials sign-in requires JWT sessions; database sessions are not
    // supported for this provider. Revocation is handled by tokenVersion.
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    /**
     * Coarse gate used by middleware. This is a fast redirect for unauthenticated
     * visitors, never the authorisation decision — that is re-made server-side
     * against the database on every protected route and action.
     */
    authorized({ auth, request }) {
      if (!request.nextUrl.pathname.startsWith("/admin")) return true;
      return Boolean(auth?.user);
    },

    jwt({ token, user, trigger, session }) {
      if (user) {
        token.staffId = user.id as string;
        token.roleKey = user.roleKey;
        token.tokenVersion = user.tokenVersion;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionId = user.sessionId;
      }

      if (trigger === "update" && session) {
        token.mustChangePassword = Boolean(
          (session as { mustChangePassword?: boolean }).mustChangePassword,
        );
      }

      return token;
    },

    session({ session, token }) {
      session.user.id = token.staffId;
      session.user.roleKey = token.roleKey;
      session.user.tokenVersion = token.tokenVersion;
      session.user.mustChangePassword = token.mustChangePassword;
      session.user.sessionId = token.sessionId;
      return session;
    },
  },
} satisfies NextAuthConfig;
