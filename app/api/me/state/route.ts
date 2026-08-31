import { auth } from "@/auth";
import { setUserState } from "@/lib/store";
import { UF_MAP } from "@/lib/states";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const twitterId = session?.user?.twitterId;
  if (!twitterId) return Response.json({ error: "Entre com o X primeiro." }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { state?: string };
  const state = body.state?.trim().toUpperCase();
  if (!state || !UF_MAP[state]) {
    return Response.json({ error: "Selecione um estado válido." }, { status: 400 });
  }

  await setUserState(twitterId, state);
  return Response.json({ ok: true, state });
}
