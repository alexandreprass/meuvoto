import { getResults } from "@/lib/results";
import type { OfficeId } from "@/lib/offices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseOffice(value: string | null): OfficeId {
  if (value === "senador" || value === "deputado_federal" || value === "deputado_estadual") return value;
  return "presidente";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const results = await getResults(parseOffice(url.searchParams.get("office")));
  return Response.json(results, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}