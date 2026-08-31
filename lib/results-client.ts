import { CANDIDATES } from "./candidates";
import { STATES } from "./states";
import type { CandidateTally, ResultsPayload } from "./types";

function emptyTallies(): CandidateTally[] {
  return CANDIDATES.map((c) => ({ id: c.id, votes: 0, percent: 0 }));
}

export function emptyResults(): ResultsPayload {
  const empty = emptyTallies();
  return {
    total: 0,
    national: empty,
    byState: Object.fromEntries(
      STATES.map((s) => [s.uf, { total: 0, candidates: empty }]),
    ),
  };
}
