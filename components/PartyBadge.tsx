import { useState } from "react";
import { getPartyLogoPath } from "@/lib/party-brand";

export function PartyBadge({ party, size = 36 }: { party: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      aria-label={`Partido ${party}`}
      title={party}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {failed ? <span className="px-1 text-center text-[8px] font-semibold leading-tight text-neutral-600">{party}</span> : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={getPartyLogoPath(party)} alt={party} className="h-full w-full object-contain" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
