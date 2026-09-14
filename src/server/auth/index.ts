import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/server/db";
import { loginSchema } from "@/lib/validation/auth";
import { authConfig } from "./config";
import { burnPasswordComparison, verifyPassword } from "./password";
import { recordLoginAttempt } from "./throttle";
import { recordAuditEvent } from "@/server/audit/log";

function clientAddress(request: Request | undefined): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },

      /**
       * Every failure path — unknown email, wrong password, deactivated account
       * — returns null, producing one indistinguishable error. Callers must not
       * be able to tell which of the three happened.
       */
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const ipAddress = clientAddress(request);
        const userAgent = request?.headers.get("user-agent") ?? null;

        const fail = async () => {
          await recordLoginAttempt({
            email,
            ipAddress,
            userAgent,
            successful: false,
          });
          return null;
        };

        const staff = await prisma.staff.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            status: true,
            tokenVersion: true,
            mustChangePassword: true,
            role: { select: { key: true } },
          },
        });

        if (!staff) {
          // Spend comparable time so response timing does not reveal that the
          // account is missing.
          await burnPasswordComparison(password);
          return fail();
        }

        const passwordValid = await verifyPassword(password, staff.passwordHash);
        if (!passwordValid) return fail();

        if (staff.status !== "ACTIVE") return fail();

        await recordLoginAttempt({
          email,
          ipAddress,
          userAgent,
          successful: true,
        });

        await prisma.staff.update({
          where: { id: staff.id },
          data: { lastLoginAt: new Date() },
        });

        await recordAuditEvent({
          actorId: staff.id,
          actorEmail: staff.email,
          action: "AUTH_LOGIN_SUCCEEDED",
          entityType: "Staff",
          entityId: staff.id,
          ipAddress,
          userAgent,
        });

        return {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          roleKey: staff.role.key,
          tokenVersion: staff.tokenVersion,
          mustChangePassword: staff.mustChangePassword,
        };
      },
    }),
  ],
});
