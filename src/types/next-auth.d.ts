import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleKey: string;
      tokenVersion: number;
      mustChangePassword: boolean;
      sessionId: string;
    } & DefaultSession["user"];
  }

  interface User {
    roleKey: string;
    tokenVersion: number;
    mustChangePassword: boolean;
    sessionId: string;
  }
}

// Must target @auth/core/jwt, not next-auth/jwt: the latter only re-exports the
// interface, and augmenting a re-export does not extend the original.
declare module "@auth/core/jwt" {
  interface JWT {
    staffId: string;
    roleKey: string;
    tokenVersion: number;
    mustChangePassword: boolean;
    sessionId: string;
  }
}
