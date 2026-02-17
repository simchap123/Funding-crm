import NextAuth from "next-auth";
import { authConfigBase } from "@/lib/auth/config.edge";

export default NextAuth(authConfigBase).auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)",
  ],
};
