import { readFile } from "fs/promises";
import path from "path";
import { getCandidateForOffice } from "@/lib/ballot";
import type { OfficeId } from "@/lib/offices";
import { UF_MAP } from "@/lib/states";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TSE_PHOTO = /^https:\/\/divulgacandcontas\.tse\.jus\.br\/divulga\/rest\/arquivo\/img\/\d+\/\d+\/[A-Z]{2}$/;

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
  if (!office || !id) return new Response("Candidato inválido.", { status: 400 });
  if (office !== "presidente" && (!state || !UF_MAP[state])) {
    return new Response("Estado inválido.", { status: 400 });
  }

  const candidate = getCandidateForOffice(office, id, state);
  if (!candidate) return new Response("Candidato não encontrado.", { status: 404 });

  if (candidate.photo.startsWith("/candidates/")) {
    const file = path.join(process.cwd(), "public", candidate.photo);
    const bytes = await readFile(file);
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  if (!TSE_PHOTO.test(candidate.photo)) {
    return new Response("Foto indisponível.", { status: 404 });
  }

  const upstream = await fetch(candidate.photo, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; MeuVoto/1.0; +https://meuvoto.org)",
      Referer: "https://divulgacandcontas.tse.jus.br/",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!upstream.ok) return new Response("Foto indisponível.", { status: 502 });
  const bytes = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!contentType?.startsWith("image/") || bytes.byteLength < 100) {
    return new Response("Foto indisponivel.", { status: 502 });
  }
  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
