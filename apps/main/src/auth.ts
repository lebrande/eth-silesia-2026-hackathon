import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// Hardcoded admin fallback (hackathon) — działa nawet bez rekordu w DB.
const ADMIN_EMAIL = "admin@ethsilesia.pl";
const ADMIN_PASSWORD = "admin";

const config: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 48 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // 1. Spróbuj DB (users table + bcrypt)
        try {
          const [row] = await db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              passwordHash: users.passwordHash,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (row?.passwordHash) {
            const ok = await compare(password, row.passwordHash);
            if (ok) {
              return {
                id: row.id,
                email: row.email,
                name: row.name ?? null,
              };
            }
            return null;
          }
        } catch (err) {
          console.error("[auth] DB lookup failed, falling back to admin:", err);
        }

        // 2. Fallback — hardcoded admin
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          return { id: "admin", name: "Admin", email: ADMIN_EMAIL };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    authorized: async ({ auth }) => !!auth,
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
