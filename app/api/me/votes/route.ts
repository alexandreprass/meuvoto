import { auth } from "@/auth";
import { deleteOwnVotesOnce } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await auth();
  const twitterId = session?.user?.twitterId;
  if (!twitterId) return Response.json({ error: "Entre com o X primeiro." }, { status: 401 });

  const deleted = await deleteOwnVotesOnce(twitterId);
  if (!deleted) {
    return Response.json(
      { error: "Você já utilizou a única exclusão de votos disponível." },
      { status: 409 },
    );
  }
  return Response.json({ ok: true });
}
