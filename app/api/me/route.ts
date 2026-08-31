import { auth } from "@/auth";
import { findVote } from "@/lib/store";
import type { MePayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const twitterId = session?.user?.twitterId;

  if (!twitterId) {
    const payload: MePayload = { loggedIn: false, vote: null };
    return Response.json(payload);
  }

  const vote = await findVote(twitterId);

  const payload: MePayload = {
    loggedIn: true,
    twitterId,
    username: session.user.username,
    name: session.user.name ?? undefined,
    image: session.user.image ?? undefined,
    vote: vote
      ? {
          candidateId: vote.candidateId,
          state: vote.state,
          createdAt: vote.createdAt,
        }
      : null,
  };

  return Response.json(payload);
}
