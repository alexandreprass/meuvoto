import { getResults } from "@/lib/results";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const results = await getResults();
  return Response.json(results, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
