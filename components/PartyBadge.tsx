import { getPartyColor, getPartyMark } from "@/lib/party-brand";

export function PartyBadge({ party, size = 36 }: { party: string; size?: number }) {
  return (
    <span
      aria-label={`Partido ${party}`}
      title={party}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white font-bold tracking-tight text-white shadow-sm ring-1 ring-black/10"
      style={{ backgroundColor: getPartyColor(party), width: size, height: size, fontSize: Math.max(8, size * 0.25) }}
    >
      {getPartyMark(party)}
    </span>
  );
}
