"use client";

import { useMemo, useState } from "react";
import type { Candidate } from "@/lib/offices";

type Props = {
  candidates: Candidate[];
  selectedId?: string;
  onOpen: (candidate: Candidate) => void;
};

export function CandidateList({ candidates, selectedId, onOpen }: Props) {
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
  const visible = filtered.slice(0, 80);

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
          className="mb-3 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
        />
      ) : null}
      <ul className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto pr-1">
        {visible.map((candidate) => {
          const selected = candidate.id === selectedId;
          return (
            <li
              className={`flex items-center gap-3 rounded-2xl border p-2.5 ${
                selected ? "border-emerald-600 bg-emerald-50" : "border-neutral-200"
              }`}
            >
              <button
                type="button"
                onClick={() => onOpen(candidate)}
                className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-400"
                aria-label={"Ver patrimônio e prestação de contas de " + candidate.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={candidate.photo}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = candidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg";
                  }}
                  className="h-12 w-12 rounded-full object-cover object-top"
                />
              </button>
              <button type="button" onClick={() => onOpen(candidate)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-neutral-950">{candidate.name}</span>
                <span className="block text-[11px] uppercase tracking-wide text-neutral-400">
                  {candidate.party} · {candidate.number}
                </span>
              </button>
              {selected ? (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Sua escolha
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {filtered.length > visible.length ? (
        <p className="mt-2 text-center text-xs text-neutral-400">
          Mostrando 80 de {filtered.length}. Refine a busca.
        </p>
      ) : null}
    </div>
  );
}
