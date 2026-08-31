import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";

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
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as TwitterProfileData;
        token.twitterId = p.data?.id ?? p.id;
        token.username = p.data?.username ?? p.username;
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
