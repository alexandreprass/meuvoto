import { CANDIDATES } from "./candidates";
import { STATES } from "./states";
import { listVotes } from "./store";
import type { CandidateTally, ResultsPayload, StateTally } from "./types";

function toTallies(
  counts: Record<string, number>,
  total: number,
): CandidateTally[] {
  return CANDIDATES.map((c) => {
    const votes = counts[c.id] ?? 0;
    return {
      id: c.id,
      votes,
      percent: total === 0 ? 0 : (votes / total) * 100,
    };
  }).sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id));
}

export async function getResults(): Promise<ResultsPayload> {
  const votes = await listVotes();
  const nationalCounts: Record<string, number> = {};
  const stateCounts: Record<string, Record<string, number>> = {};
  let total = 0;

  for (const uf of STATES.map((s) => s.uf)) {
    stateCounts[uf] = {};
  }

  for (const row of votes) {
    total += 1;
    nationalCounts[row.candidateId] = (nationalCounts[row.candidateId] ?? 0) + 1;
    if (!stateCounts[row.state]) stateCounts[row.state] = {};
    stateCounts[row.state][row.candidateId] =
      (stateCounts[row.state][row.candidateId] ?? 0) + 1;
  }

  const byState: Record<string, StateTally> = {};
  for (const [uf, counts] of Object.entries(stateCounts)) {
    const stateTotal = Object.values(counts).reduce((a, b) => a + b, 0);
    byState[uf] = {
      total: stateTotal,
      candidates: toTallies(counts, stateTotal),
    };
  }

  return {
    total,
    national: toTallies(nationalCounts, total),
    byState,
  };
}
