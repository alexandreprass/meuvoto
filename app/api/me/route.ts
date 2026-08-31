import { auth } from "@/auth";
import { canUserDeleteVotes, getUserState, listUserVotes } from "@/lib/store";
import type { MePayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const twitterId = session?.user?.twitterId;

  if (!twitterId) {
    const payload: MePayload = { loggedIn: false, vote: null, votes: [] };
    return Response.json(payload);
  }

  const [votes, state, canDeleteVotes] = await Promise.all([
    listUserVotes(twitterId),
    getUserState(twitterId),
    canUserDeleteVotes(twitterId),
  ]);
  const serializedVotes = votes.map((vote) => ({
    office: vote.office,
    candidateId: vote.candidateId,
    state: vote.state,
    stateKey: vote.stateKey,
    createdAt: vote.createdAt,
  }));
  const presidentVote = serializedVotes.find((vote) => vote.office === "presidente") ?? null;

  const payload: MePayload = {
    loggedIn: true,
    twitterId,
    username: session.user.username,
    name: session.user.name ?? undefined,
    image: session.user.image ?? undefined,
    state,
    canDeleteVotes,
    vote: presidentVote,
    votes: serializedVotes,
  };

  return Response.json(payload);
}