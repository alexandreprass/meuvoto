"use client";

import { CANDIDATES, getCandidate } from "@/lib/candidates";
import { formatPercent, formatVotes } from "@/lib/states";
import type { CandidateTally } from "@/lib/types";

type Props = {
  tallies: CandidateTally[];
  compact?: boolean;
};

export function CandidateBars({ tallies, compact }: Props) {
  const max = Math.max(1, ...tallies.map((t) => t.percent));
  const ordered = CANDIDATES.map((c) => tallies.find((t) => t.id === c.id)).filter(
    Boolean,
  ) as CandidateTally[];
  const ranked = [...ordered].sort((a, b) => b.votes - a.votes);

  return (
    <ul className="flex flex-col gap-3">
      {ranked.map((t) => {
        const c = getCandidate(t.id);
        if (!c) return null;
        const width = max === 0 ? 0 : (t.percent / max) * 100;
        return (
          <li key={c.id} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.photo}
              alt={c.name}
              className={`rounded-full object-cover object-top ring-2 ring-white shadow-sm ${
                compact ? "h-9 w-9" : "h-12 w-12"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className={`truncate font-semibold text-neutral-950 ${compact ? "text-sm" : "text-[15px]"}`}>
                    {c.name}
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                    {c.party} · {c.number}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold tabular-nums text-neutral-950 ${compact ? "text-sm" : "text-base"}`}>
                    {formatPercent(t.percent)}%
                  </p>
                  <p className="text-[11px] tabular-nums text-neutral-400">
                    {formatVotes(t.votes)} {t.votes === 1 ? "voto" : "votos"}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${width}%`, backgroundColor: c.color }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
