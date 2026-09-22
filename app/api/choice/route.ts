import { auth } from "@/auth";
import { getCandidateForOffice } from "@/lib/ballot";
import { voteScope, type OfficeId } from "@/lib/offices";
import { getUserState, saveChoice } from "@/lib/store";
import { UF_MAP } from "@/lib/states";

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
    return Response.json({ error: "Entre com o X para guardar sua escolha." }, { status: 401 });
  }

  let body: { office?: string; candidateId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const state = await getUserState(twitterId);
  if (!state || !UF_MAP[state]) {
    return Response.json({ error: "Escolha seu estado antes de guardar." }, { status: 428 });
  }

  const office = parseOffice(body.office);
  const candidateId = body.candidateId?.trim();
  if (!office || !candidateId || !getCandidateForOffice(office, candidateId, state)) {
    return Response.json({ error: "Candidato inválido para este cargo." }, { status: 400 });
  }

  const saved = await saveChoice({
    twitterId,
    twitterUser: session.user.username ?? null,
    twitterName: session.user.name ?? null,
    office,
    candidateId,
    state,
    stateKey: voteScope(office, state),
  });

  return Response.json({
    ok: true,
    choice: {
      office: saved.office,
      candidateId: saved.candidateId,
      state: saved.state,
      stateKey: saved.stateKey,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    },
  });
}
