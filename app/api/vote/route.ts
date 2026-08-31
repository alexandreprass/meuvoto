import { auth } from "@/auth";
import { getCandidateForOffice } from "@/lib/ballot";
import { getResults, voteScope } from "@/lib/results";
import type { OfficeId } from "@/lib/offices";
import { UF_MAP } from "@/lib/states";
import { createVote, getUserState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseOffice(value?: string): OfficeId | null {
  if (!value || value === "presidente") return "presidente";
  if (value === "senador" || value === "deputado_federal" || value === "deputado_estadual") return value;
  return null;
}

export async function POST(req: Request) {
  const session = await auth();
  const twitterId = session?.user?.twitterId;

  if (!twitterId) {
    return Response.json(
      { error: "Entre com o X para votar. Cada conta tem direito a 1 voto por disputa." },
      { status: 401 },
    );
  }

  let body: { office?: string; candidateId?: string; state?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const savedState = await getUserState(twitterId);
  if (!savedState) {
    return Response.json({ error: "Escolha seu estado antes de votar." }, { status: 428 });
  }

  const office = parseOffice(body.office);
  const candidateId = body.candidateId?.trim();
  const requestedState = body.state?.trim().toUpperCase();
  const state = savedState;

  if (!office) {
    return Response.json({ error: "Cargo inválido." }, { status: 400 });
  }

  if (!state || !UF_MAP[state] || (requestedState && requestedState !== state)) {
    return Response.json(
      { error: "Informe o estado em que você vota." },
      { status: 400 },
    );
  }

  if (!candidateId || !getCandidateForOffice(office, candidateId, state)) {
    return Response.json({ error: "Candidato inválido para este cargo/estado." }, { status: 400 });
  }

  const stateKey = voteScope(office, state);
  const result = await createVote({
    twitterId,
    twitterUser: session.user.username ?? null,
    twitterName: session.user.name ?? null,
    office,
    candidateId,
    state,
    stateKey,
  });

  if (!result.ok) {
    return Response.json(
      {
        error:
          office === "presidente"
            ? "Você já votou para presidente. Cada conta X tem direito a 1 voto."
            : "Você já votou para este cargo neste estado.",
        vote: {
          office: result.existing.office,
          candidateId: result.existing.candidateId,
          state: result.existing.state,
          stateKey: result.existing.stateKey,
          createdAt: result.existing.createdAt,
        },
      },
      { status: 409 },
    );
  }

  const results = await getResults(office);
  return Response.json({ ok: true, results });
}