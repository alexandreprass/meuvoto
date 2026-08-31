import { getCandidatesForOffice } from "@/lib/ballot";
import type { OfficeId } from "@/lib/offices";
import { UF_MAP } from "@/lib/states";

export const dynamic = "force-dynamic";

function parseOffice(value: string | null): OfficeId {
  if (value === "senador" || value === "deputado_federal" || value === "deputado_estadual") return value;
  return "presidente";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const office = parseOffice(url.searchParams.get("office"));
  const state = url.searchParams.get("state")?.toUpperCase();

  if (office !== "presidente" && (!state || !UF_MAP[state])) {
    return Response.json({ error: "Estado inválido." }, { status: 400 });
  }

  return Response.json({
    office,
    state: office === "presidente" ? "BR" : state,
    candidates: getCandidatesForOffice(office, state),
  });
}
