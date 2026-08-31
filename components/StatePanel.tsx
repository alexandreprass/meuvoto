"use client";

import { UF_MAP, formatVotes } from "@/lib/states";
import type { ResultsPayload } from "@/lib/types";
import { CandidateBars } from "./CandidateBar";

type Props = {
  uf: string;
  results: ResultsPayload;
  onClose?: () => void;
};

export function StatePanel({ uf, results, onClose }: Props) {
  const state = UF_MAP[uf];
  const tally = results.byState[uf];
  if (!state || !tally) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl shadow-neutral-900/5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: state.color }}
          />
          <div>
            <p className="text-sm font-semibold text-neutral-950">{state.name}</p>
            <p className="text-xs text-neutral-400">
              {formatVotes(tally.total)} {tally.total === 1 ? "voto" : "votos"} neste estado
            </p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            Fechar
          </button>
        ) : null}
      </div>
      <CandidateBars tallies={tally.candidates} compact />
    </div>
  );
}
