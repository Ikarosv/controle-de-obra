// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { findUserByEmail } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function resolveAuthSecret(): string {
  const envSecret = (
    process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  )?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  const vercelAutoSecret =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelAutoSecret) {
    return `vercel-derived-auth-secret-${vercelAutoSecret}-controle-obra-2026`;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CRITICAL SECURITY ERROR: AUTH_SECRET environment variable must be explicitly configured in production."
    );
  }
  return "dev-only-local-fallback-secret-do-not-use-in-prod-2026";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: resolveAuthSecret(),
  trustHost: true,
  providers: [
    Credentials({
      name: "Credenciais da Obra",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await findUserByEmail(parsed.data.email);
        if (!user) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
