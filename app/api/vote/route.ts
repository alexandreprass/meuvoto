import { auth } from "@/auth";
import { CANDIDATES } from "@/lib/candidates";
import { getResults } from "@/lib/results";
import { UF_MAP } from "@/lib/states";
import { createVote } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const twitterId = session?.user?.twitterId;

  if (!twitterId) {
    return Response.json(
      { error: "Entre com o X para votar. Cada conta tem direito a 1 voto." },
      { status: 401 },
    );
  }

  let body: { candidateId?: string; state?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const candidateId = body.candidateId?.trim();
  const state = body.state?.trim().toUpperCase();

  if (!candidateId || !CANDIDATES.some((c) => c.id === candidateId)) {
    return Response.json({ error: "Candidato inválido." }, { status: 400 });
  }

  if (!state || !UF_MAP[state]) {
    return Response.json(
      { error: "Informe o estado em que você vota." },
      { status: 400 },
    );
  }

  const result = await createVote({
    twitterId,
    twitterUser: session.user.username ?? null,
    twitterName: session.user.name ?? null,
    candidateId,
    state,
  });

  if (!result.ok) {
    return Response.json(
      {
        error: "Você já votou. Cada conta X tem direito a 1 voto.",
        vote: {
          candidateId: result.existing.candidateId,
          state: result.existing.state,
          createdAt: result.existing.createdAt,
        },
      },
      { status: 409 },
    );
  }

  const results = await getResults();
  return Response.json({ ok: true, results });
}
