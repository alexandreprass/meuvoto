export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") || "meuvoto.digital";
  const response = await fetch(`https://countapi.mileshilliard.com/api/v1/hit/${encodeURIComponent(key)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return Response.json({ value: null }, { status: 502 });
  }
  const data = await response.json();
  return Response.json({ value: data.value ?? null });
}
