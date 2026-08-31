"use client";

import type { Candidate, OfficeId } from "@/lib/offices";
import { UF_MAP, formatVotes } from "@/lib/states";
import type { ResultsPayload } from "@/lib/types";
import { CandidateBars } from "./CandidateBar";

type Props = {
  uf: string;
  office: OfficeId;
  candidates: Candidate[];
  results: ResultsPayload;
  onClose?: () => void;
  mini?: boolean;
};

export function StatePanel({ uf, office, candidates, results, onClose, mini }: Props) {
  const state = UF_MAP[uf];
  const tally = results.byState[uf];
  if (!state || !tally) return null;

  return (
    <div
      className={`border border-neutral-200 bg-white shadow-lg shadow-neutral-900/10 ${
        mini ? "rounded-xl p-2" : "rounded-2xl p-4"
      }`}
    >
      <div className={`flex items-start justify-between gap-2 ${mini ? "mb-1.5" : "mb-3"}`}>
        <div className="flex items-center gap-1.5">
          <span
            className={mini ? "h-2 w-2 rounded-full" : "h-3 w-3 rounded-full"}
            style={{ backgroundColor: state.color }}
          />
          <div>
            <p className={mini ? "text-[11px] font-semibold text-neutral-950" : "text-sm font-semibold text-neutral-950"}>
              {state.name}
            </p>
            <p className={mini ? "text-[9px] text-neutral-400" : "text-xs text-neutral-400"}>
              {formatVotes(tally.total)} {tally.total === 1 ? "voto" : "votos"}
              {office === "senador" ? " para senador" : ""}
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
      <CandidateBars candidates={candidates} tallies={tally.candidates} compact={!mini} mini={mini} />
    </div>
  );
}