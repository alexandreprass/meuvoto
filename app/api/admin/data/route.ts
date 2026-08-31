import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCandidateForOffice } from "@/lib/ballot";
import type { OfficeId } from "@/lib/offices";
import {
  deleteAdminUsers,
  deleteAdminVotes,
  listAdminUsers,
  setUsersBlocked,
} from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "Não autorizado." }, { status: 401 });
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorized();
  const users = await listAdminUsers();
  return Response.json({
    users: users.map((user) => ({
      ...user,
      votes: user.votes.map((vote) => {
        const candidate = getCandidateForOffice(vote.office, vote.candidateId, vote.state);
        return {
          ...vote,
          candidateName: candidate?.name ?? vote.candidateId,
          candidateParty: candidate?.party ?? null,
          candidateNumber: candidate?.number ?? null,
        };
      }),
    })),
  });
}

type VoteKey = { twitterId: string; office: OfficeId; stateKey: string };
type Body =
  | { action: "delete_votes"; votes: VoteKey[] }
  | { action: "block_users" | "unblock_users" | "delete_users"; twitterIds: string[] };

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return unauthorized();
  const body = await req.json().catch(() => null) as Body | null;
  if (!body) return Response.json({ error: "Requisição inválida." }, { status: 400 });

  if (body.action === "delete_votes" && Array.isArray(body.votes)) {
    await deleteAdminVotes(body.votes.slice(0, 1000));
  } else if (
    (body.action === "block_users" || body.action === "unblock_users" || body.action === "delete_users") &&
    Array.isArray(body.twitterIds)
  ) {
    const ids = body.twitterIds.filter((id) => typeof id === "string").slice(0, 1000);
    if (body.action === "delete_users") await deleteAdminUsers(ids);
    else await setUsersBlocked(ids, body.action === "block_users");
  } else {
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  }

  return Response.json({ ok: true });
}
