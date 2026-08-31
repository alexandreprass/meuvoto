import { auth } from "@/auth";
import { getCandidateForOffice } from "@/lib/ballot";
import type { OfficeId } from "@/lib/offices";
import { getResults, voteScope } from "@/lib/results";
import { UF_MAP } from "@/lib/states";
import { changeVote, getUserState } from "@/lib/store";

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
    return Response.json({ error: "Entre com o X para mudar seu voto." }, { status: 401 });
  }

  let body: { office?: string; candidateId?: string; state?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const office = parseOffice(body.office);
  const candidateId = body.candidateId?.trim();
  const requestedState = body.state?.trim().toUpperCase();
  const state = await getUserState(twitterId);

  if (!office) {
    return Response.json({ error: "Cargo inválido." }, { status: 400 });
  }
  if (!state || !UF_MAP[state] || (requestedState && requestedState !== state)) {
    return Response.json({ error: "Informe o estado em que você vota." }, { status: 400 });
  }
  if (!candidateId || !getCandidateForOffice(office, candidateId, state)) {
    return Response.json({ error: "Candidato inválido para este cargo/estado." }, { status: 400 });
  }

  const result = await changeVote({
    twitterId,
    twitterUser: session.user.username ?? null,
    twitterName: session.user.name ?? null,
    office,
    candidateId,
    state,
    stateKey: voteScope(office, state),
  });

  if (!result.ok) {
    const errors = {
      not_found: "Você ainda não votou neste cargo.",
      locked: "AGUARDE DOMINGO 00:00 PARA MUDAR SEU VOTO",
      same_candidate: "Escolha um candidato diferente do seu voto atual.",
    };
    return Response.json(
      { error: errors[result.reason] },
      { status: result.reason === "not_found" ? 404 : 409 },
    );
  }

  const results = await getResults(office);
  return Response.json({ ok: true, results });
}
