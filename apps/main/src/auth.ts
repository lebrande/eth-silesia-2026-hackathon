import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Hardcoded admin credentials (hackathon project)
const ADMIN_EMAIL = "admin@ethsilesia.pl";
const ADMIN_PASSWORD = "admin";

const config: NextAuthConfig = {
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
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          return { id: "admin", name: "Admin", email: ADMIN_EMAIL };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    authorized: async ({ auth }) => {
      return !!auth;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
