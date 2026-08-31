import { auth } from "@/auth";
import { getCandidateForOffice } from "@/lib/ballot";
import { addMessage, listUserVotes, listMessages } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serialize(messages: Awaited<ReturnType<typeof listMessages>>) {
  return messages.map((m) => {
    const candidate = m.candidateId
      ? getCandidateForOffice("presidente", m.candidateId)
      : undefined;
    return {
      id: m.id,
      name: m.name || m.username || "Usuário",
      username: m.username,
      candidateNumber: candidate?.number ?? null,
      candidateColor: candidate?.color ?? null,
      body: m.body,
      createdAt: m.createdAt,
    };
  });
}

export async function GET() {
  const messages = await listMessages();
  return Response.json({ messages: serialize(messages) });
}

export async function POST(req: Request) {
  const session = await auth();
  const twitterId = session?.user?.twitterId;
  if (!twitterId) {
    return Response.json(
      { error: "Entre com o X para participar." },
      { status: 401 },
    );
  }

  const votes = await listUserVotes(twitterId);
  const vote = votes.find((item) => item.office === "presidente") ?? votes[0];
  if (!vote) {
    return Response.json(
      { error: "Vote primeiro para dar sua opinião" },
      { status: 403 },
    );
  }

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const text = (body.body ?? "").trim().replace(/\s+/g, " ");
  if (!text) {
    return Response.json({ error: "Escreva uma mensagem." }, { status: 400 });
  }
  if (text.length > 280) {
    return Response.json({ error: "Máximo de 280 caracteres." }, { status: 400 });
  }

  await addMessage({
    twitterId,
    username: session.user.username ?? null,
    name: session.user.name ?? session.user.username ?? null,
    candidateId: vote.candidateId,
    body: text,
  });

  const messages = await listMessages();
  return Response.json({ ok: true, messages: serialize(messages) });
}