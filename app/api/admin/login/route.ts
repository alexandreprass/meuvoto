import { setAdminCookie, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { password?: string };
  if (!verifyAdminPassword(body.password ?? "")) {
    return Response.json({ error: "Senha administrativa inválida." }, { status: 401 });
  }
  await setAdminCookie();
  return Response.json({ ok: true });
}
