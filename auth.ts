import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { isOwnerProfileId } from "@/lib/auth/owner-rule";

/* GitHub is the only provider and exactly one account may sign in: the one whose
   numeric id is OWNER_GITHUB_ID. A stranger is rejected in `signIn`, so they never
   get a session. Sessions are JWTs with an absolute 8-hour lifetime. */

export const SESSION_SECONDS = 8 * 60 * 60;

declare module "next-auth" {
  interface Session {
    user: { isOwner: boolean } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    githubId?: string;
    isOwner?: boolean;
    /** seconds since the epoch, set once at sign-in; the session ends 8 hours later */
    loginAt?: number;
  }
}

const ownerId = () => process.env.OWNER_GITHUB_ID;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt", maxAge: SESSION_SECONDS },
  jwt: { maxAge: SESSION_SECONDS },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    signIn({ account, profile }) {
      return account?.provider === "github" && isOwnerProfileId(profile?.id, ownerId());
    },
    jwt({ token, account, profile }) {
      if (account && profile) {
        token.githubId = String(profile.id);
        token.isOwner = isOwnerProfileId(profile.id, ownerId());
        token.loginAt = Math.floor(Date.now() / 1000);
      }
      // absolute lifetime: rolling refreshes never extend a session past 8 hours
      if (typeof token.loginAt !== "number" || Date.now() / 1000 - token.loginAt > SESSION_SECONDS) return null;
      return token;
    },
    session({ session, token }) {
      // re-checked on every read, so removing or changing OWNER_GITHUB_ID locks everyone out at once
      session.user.isOwner = token.isOwner === true && isOwnerProfileId(token.githubId, ownerId());
      return session;
    },
    // gate 1 (proxy.ts): anything but an owner session is sent to the sign-in page
    authorized({ auth }) {
      return auth?.user?.isOwner === true;
    },
  },
});
