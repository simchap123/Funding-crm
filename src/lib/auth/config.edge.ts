import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — NO database imports
// Used by middleware (runs in edge runtime)
export const authConfigBase = {
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }: any) {
      const isLoggedIn = !!auth?.user;
      const isPublic = ["/login", "/api/auth", "/sign"].some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      if (!isLoggedIn && !isPublic) return false;
      if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
  },
  providers: [],
} satisfies NextAuthConfig;
