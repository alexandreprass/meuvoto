"use client";

import { useMemo, useState } from "react";
import type { Candidate, OfficeId } from "@/lib/offices";
import { PartyBadge } from "./PartyBadge";

type Props = {
  candidates: Candidate[];
  office: OfficeId;
  state: string;
  selectedId?: string;
  onOpen: (candidate: Candidate) => void;
};

export function CandidateList({ candidates, office, state, selectedId, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const ordered = useMemo(
    () =>
      candidates.slice().sort(
        (a, b) =>
          a.number.localeCompare(b.number, "pt-BR", { numeric: true }) ||
          a.name.localeCompare(b.name, "pt-BR"),
      ),
    [candidates],
  );
  const filtered = ordered.filter((candidate) => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return true;
    return [candidate.name, candidate.fullName, candidate.party, candidate.number].some((value) =>
      value.toLocaleLowerCase("pt-BR").includes(term),
    );
  });
  const visible = filtered;

  if (candidates.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
        Nenhum candidato carregado para este estado.
      </p>
    );
  }

  return (
    <div>
      {candidates.length > 12 ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, partido ou número"
          className="mb-2 w-full rounded-xl border border-neutral-200 px-3 py-1.5 text-xs outline-none focus:border-neutral-400"
        />
      ) : null}
      <ul className="flex max-h-[62vh] flex-col gap-1.5 overflow-y-auto pr-1">
        {visible.map((candidate) => {
          const selected = candidate.id === selectedId;
          return (
            <li
              key={candidate.id}
              className={`flex items-center gap-2.5 rounded-xl border border-black p-2 shadow-sm ${
                selected ? "bg-emerald-50" : "bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => onOpen(candidate)}
                className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-400"
                aria-label={"Ver patrimônio e biografia de " + candidate.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={candidatePhotoSrc(office, candidate, state)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = candidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg";
                  }}
                  className="h-12 w-12 rounded-full object-cover object-top ring-2 ring-white shadow-sm"
                />
              </button>
              <button type="button" onClick={() => onOpen(candidate)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-neutral-950">{candidate.name}</span>
                <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wide text-neutral-500">
                  {candidate.party}
                </span>
              </button>
              <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-lg font-extrabold tabular-nums tracking-wide text-emerald-900 ring-1 ring-emerald-200 sm:text-xl">
                {candidate.number}
              </span>
              <PartyBadge party={candidate.party} size={30} />
              {selected ? <span className="sr-only">Sua escolha</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function candidatePhotoSrc(office: OfficeId, candidate: Candidate, state: string) {
  const params = new URLSearchParams({ office, id: candidate.id, state: candidate.state ?? state });
  return `/api/candidate/photo?${params}`;
}
