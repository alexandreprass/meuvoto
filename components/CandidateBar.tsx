"use client";

import type { Candidate } from "@/lib/offices";
import { formatPercent, formatVotes } from "@/lib/states";
import type { CandidateTally } from "@/lib/types";

type Props = {
  candidates: Candidate[];
  tallies: CandidateTally[];
  compact?: boolean;
  mini?: boolean;
};

export function CandidateBars({ candidates, tallies, compact, mini }: Props) {
  const max = Math.max(1, ...tallies.map((t) => t.percent));
  const ordered = candidates.map((candidate) =>
    tallies.find((tally) => tally.id === candidate.id) ?? { id: candidate.id, votes: 0, percent: 0 },
  );
  const ranked = [...ordered]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, mini ? 5 : compact ? 12 : 40);

  if (candidates.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
        Nenhum candidato carregado para este estado.
      </p>
    );
  }

  return (
    <ul className={`flex flex-col ${mini ? "gap-1" : compact ? "gap-2" : "gap-3"}`}>
      {ranked.map((t) => {
        const c = candidates.find((candidate) => candidate.id === t.id);
        if (!c) return null;
        const width = max === 0 ? 0 : (t.percent / max) * 100;
        return (
          <li key={c.id} className={`flex items-center ${mini ? "gap-1.5" : "gap-3"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.photo}
              alt={c.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = c.fallbackPhoto ?? "/candidates/senators/placeholder.svg";
              }}
              className={`rounded-full object-cover object-top ring-2 ring-white shadow-sm ${
                mini ? "h-5 w-5" : compact ? "h-9 w-9" : "h-12 w-12"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <div className="min-w-0">
                  <p className={`truncate font-semibold text-neutral-950 ${
                    mini ? "text-[10px] leading-tight" : compact ? "text-sm" : "text-[15px]"
                  }`}>
                    {c.name}
                  </p>
                  {mini ? null : (
                    <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                      {c.party} · {c.number}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-semibold tabular-nums text-neutral-950 ${
                    mini ? "text-[10px]" : compact ? "text-sm" : "text-base"
                  }`}>
                    {formatPercent(t.percent)}%
                  </p>
                  {mini ? null : (
                    <p className="text-[11px] tabular-nums text-neutral-400">
                      {formatVotes(t.votes)} {t.votes === 1 ? "voto" : "votos"}
                    </p>
                  )}
                </div>
              </div>
              <div className={`overflow-hidden rounded-full bg-neutral-100 ${mini ? "mt-0.5 h-1" : "mt-1.5 h-1.5"}`}>
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