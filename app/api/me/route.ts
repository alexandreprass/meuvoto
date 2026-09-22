import { auth } from "@/auth";
import { getUserState, listUserVotes } from "@/lib/store";
import type { MePayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const twitterId = session?.user?.twitterId;

  if (!twitterId) {
    const payload: MePayload = { loggedIn: false, choices: [] };
    return Response.json(payload);
  }

  const [choices, state] = await Promise.all([
    listUserVotes(twitterId),
    getUserState(twitterId),
  ]);

  const payload: MePayload = {
    loggedIn: true,
    twitterId,
    username: session.user.username,
    name: session.user.name ?? undefined,
    image: session.user.image ?? undefined,
    state,
    choices: choices.map((choice) => ({
      office: choice.office,
      candidateId: choice.candidateId,
      state: choice.state,
      stateKey: choice.stateKey,
      createdAt: choice.createdAt,
      updatedAt: choice.updatedAt,
    })),
  };

  return Response.json(payload);
}
