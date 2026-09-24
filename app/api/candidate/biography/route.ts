import { getCandidateForOffice } from "@/lib/ballot";
import { getCandidateBiography, saveCandidateBiography } from "@/lib/store";
import type { OfficeId } from "@/lib/offices";
import { UF_MAP } from "@/lib/states";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseOffice(value: unknown): OfficeId | null {
  if (value === "presidente" || value === "senador" || value === "deputado_federal" || value === "deputado_estadual") {
    return value;
  }
  return null;
}

export async function POST(req: Request) {
  let body: { office?: unknown; id?: unknown; state?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const office = parseOffice(body.office);
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim().toUpperCase() : "BR";
  if (!office || !id || (office !== "presidente" && !UF_MAP[state])) {
    return Response.json({ error: "Candidato inválido." }, { status: 400 });
  }

  const candidate = getCandidateForOffice(office, id, state);
  if (!candidate) return Response.json({ error: "Candidato não encontrado." }, { status: 404 });

  const candidateState = office === "presidente" ? "BR" : candidate.state ?? state;
  const key = `${office}:${candidateState}:${candidate.id}`;
  try {
    const cached = await getCandidateBiography(key);
    if (cached) return Response.json({ biography: cached, cached: true });

    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) {
      return Response.json({ error: "A API de biografia ainda não está configurada." }, { status: 503 });
    }

    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL?.trim() || "grok-4.7",
        temperature: 0.2,
        max_output_tokens: 700,
        store: false,
        input: [
          {
            role: "system",
            content: "Escreva biografias políticas factuais e neutras. Não faça elogios ou críticas e não fale de projetos ou propostas. Responda em exatamente 10 linhas. Não invente informações. Se não encontrar informações suficientes para uma biografia, responda apenas: NÃO ENCONTREI INFORMAÇÕES SUFICIENTES PARA UMA BIOGRAFIA. Não escreva mais nada.",
          },
          {
            role: "user",
            content: `Gere a biografia do político ${candidate.name}, do partido ${candidate.party}, de forma resumida em 10 linhas. Não fale bem ou mal, nem projetos, só biografia. Se você não encontrar informações suficientes para uma biografia, apenas fale NÃO ENCONTREI INFORMAÇÕES SUFICIENTES PARA UMA BIOGRAFIA, somente isso e mais nada.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      console.error("[candidate-biography] A API do Grok retornou erro:", response.status);
      return Response.json({ error: "Não foi possível gerar a biografia agora." }, { status: 502 });
    }

    const result = await response.json();
    const biography = result.output
      ?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content ?? [])
      .filter((item: { type?: string }) => item.type === "output_text")
      .map((item: { text?: string }) => item.text ?? "")
      .join("\n")
      .trim();
    if (typeof biography !== "string" || !biography) {
      return Response.json({ error: "A IA não retornou uma biografia válida." }, { status: 502 });
    }

    const savedBiography = await saveCandidateBiography({
      key,
      id: candidate.id,
      office,
      state: candidateState,
      name: candidate.name,
      party: candidate.party,
      biography: biography.slice(0, 5000),
    });
    return Response.json({ biography: savedBiography, cached: false });
  } catch (error) {
    console.error("[candidate-biography] Falha ao buscar ou guardar a biografia:", error);
    return Response.json({ error: "Não foi possível gerar a biografia agora." }, { status: 502 });
  }
}
