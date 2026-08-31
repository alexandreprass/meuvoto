"use client";

import { useState } from "react";
import type { Candidate } from "@/lib/offices";
import { formatPercent, formatVotes, UF_MAP } from "@/lib/states";
import type { CandidateTally } from "@/lib/types";

type Props = {
  candidates: Candidate[];
  tallies: CandidateTally[];
  compact?: boolean;
  mini?: boolean;
};

export function CandidateBars({ candidates, tallies, compact, mini }: Props) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
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
    <>
    <ul className={`flex flex-col ${mini ? "gap-1" : compact ? "gap-2" : "gap-3"}`}>
      {ranked.map((t) => {
        const c = candidates.find((candidate) => candidate.id === t.id);
        if (!c) return null;
        const width = max === 0 ? 0 : (t.percent / max) * 100;
        return (
          <li key={c.id} className={`flex items-center ${mini ? "gap-1.5" : "gap-3"}`}>
            <button
              type="button"
              onClick={() => setSelectedCandidate(c)}
              className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-400"
              title={"Ver detalhes de " + c.name}
            >
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
            </button>
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
    {selectedCandidate ? (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <button type="button" className="absolute inset-0 bg-neutral-950/50" aria-label="Fechar" onClick={() => setSelectedCandidate(null)} />
        <div className="relative w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
          <button type="button" onClick={() => setSelectedCandidate(null)} aria-label="Fechar" className="absolute right-3 top-3 rounded-full p-2 text-neutral-400 hover:bg-neutral-100">×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedCandidate.photo}
            alt={selectedCandidate.name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = selectedCandidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg";
            }}
            className="mx-auto h-56 w-44 rounded-md object-cover object-top shadow-sm"
          />
          <h2 className="mt-5 text-xl font-semibold text-neutral-950">{selectedCandidate.name}</h2>
          <div className="mt-3 grid grid-cols-3 divide-x divide-neutral-200 rounded-md bg-neutral-50 py-3">
            <div><p className="text-[10px] font-semibold uppercase text-neutral-400">Número</p><p className="mt-1 font-bold">{selectedCandidate.number}</p></div>
            <div><p className="text-[10px] font-semibold uppercase text-neutral-400">Partido</p><p className="mt-1 font-bold">{selectedCandidate.party}</p></div>
            <div><p className="text-[10px] font-semibold uppercase text-neutral-400">Estado</p><p className="mt-1 font-bold">{selectedCandidate.state ? UF_MAP[selectedCandidate.state]?.name ?? selectedCandidate.state : "Brasil"}</p></div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}