import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      twitterId: string;
      username?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    twitterId?: string;
    username?: string;
  }
}
