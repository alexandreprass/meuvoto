import { getCandidateForOffice } from "@/lib/ballot";
import { loadDossier } from "@/lib/dossier";
import type { OfficeId } from "@/lib/offices";
import { tseIdentity, tsePageUrl } from "@/lib/tse";
import { UF_MAP } from "@/lib/states";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseOffice(value: string | null): OfficeId | null {
  if (!value || value === "presidente") return "presidente";
  if (value === "senador" || value === "deputado_federal" || value === "deputado_estadual") return value;
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const office = parseOffice(url.searchParams.get("office"));
  const id = url.searchParams.get("id")?.trim();
  const state = url.searchParams.get("state")?.trim().toUpperCase();

  if (!office || !id) {
    return Response.json({ error: "Candidato inválido." }, { status: 400 });
  }
  if (office !== "presidente" && (!state || !UF_MAP[state])) {
    return Response.json({ error: "Estado inválido." }, { status: 400 });
  }

  const candidate = getCandidateForOffice(office, id, state);
  if (!candidate) {
    return Response.json({ error: "Candidato não encontrado." }, { status: 404 });
  }

  const identity = tseIdentity(candidate);
  if (!identity) {
    return Response.json({
      officialUrl: null,
      loaded: false,
      situation: null,
      assetsTotal: null,
      assets: [],
      raised: null,
      spent: null,
      spendingLimit: null,
      sources: [],
      note: "Este candidato ainda não está ligado a uma ficha do TSE.",
    });
  }

  const dossier = await loadDossier(identity);
  return Response.json({ ...dossier, officialUrl: dossier.officialUrl || tsePageUrl(identity) });
}
