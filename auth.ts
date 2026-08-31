import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { upsertUser } from "@/lib/store";

if (!process.env.AUTH_URL) {
  process.env.AUTH_URL =
    process.env.RENDER_EXTERNAL_URL || "https://meuvoto.onrender.com";
}

type TwitterProfileData = {
  data?: {
    id?: string;
    name?: string;
    username?: string;
    profile_image_url?: string;
  };
  id?: string;
  username?: string;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Twitter({
      clientId: process.env.AUTH_TWITTER_ID,
      clientSecret: process.env.AUTH_TWITTER_SECRET,
    }),
  ],
  trustHost: true,
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, profile, user }) {
      if (profile) {
        const p = profile as TwitterProfileData;
        const twitterId = String(p.data?.id ?? p.id ?? "");
        token.twitterId = twitterId;
        token.username = p.data?.username ?? p.username;
        if (twitterId) {
          await upsertUser({
            twitterId,
            username: token.username ? String(token.username) : null,
            name: user?.name ?? p.data?.name ?? null,
            email: user?.email ?? null,
            image: user?.image ?? p.data?.profile_image_url ?? null,
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.twitterId = String(token.twitterId ?? "");
      session.user.username = token.username ? String(token.username) : undefined;
      return session;
    },
  },
});
